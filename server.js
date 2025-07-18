require("dotenv").config();

const fastify = require("fastify")({
  logger: true,
  trustProxy: true,
});
const path = require("path");
const fs = require("fs-extra");
const axios = require("axios");
const yauzl = require("yauzl");
const archiver = require("archiver");
const tmp = require("tmp");
const { v4: uuidv4 } = require("uuid");
// ===== SFTP 라이브러리 초기화 =====
let SftpClient = null;
try {
  SftpClient = require("ssh2-sftp-client");
  console.log("✅ ssh2-sftp-client 라이브러리 로드 성공");
} catch (error) {
  console.log("❌ ssh2-sftp-client 설치 필요: npm install ssh2-sftp-client");
}

// ===== SFTP 설정 =====
const SFTP_CONFIG = {
  PORT: 22,
  TIMEOUT: 30000,
  ALGORITHMS: {
    serverHostKey: ["ssh-rsa", "ecdsa-sha2-nistp256"],
    kex: ["diffie-hellman-group14-sha256", "ecdh-sha2-nistp256"],
    cipher: ["aes128-ctr", "aes256-ctr"],
    hmac: ["hmac-sha2-256", "hmac-sha1"],
  },
};

// ===== SFTP 유틸리티 함수 =====
const SftpUtils = {
  createConfig: (host, username, password, port = SFTP_CONFIG.PORT) => ({
    host,
    port,
    username,
    password,
    readyTimeout: SFTP_CONFIG.TIMEOUT,
    algorithms: SFTP_CONFIG.ALGORITHMS,
    hostHash: "md5",
    hostVerifier: () => true,
  }),

  async executeWithClient(sftpConfig, operation) {
    if (!SftpClient) {
      throw new Error("ssh2-sftp-client 라이브러리가 설치되지 않았습니다");
    }

    const sftp = new SftpClient();
    try {
      await sftp.connect(sftpConfig);

      // pwd 메서드 호환성 패치
      if (typeof sftp.pwd !== "function") {
        sftp.pwd = async () => "/";
      }

      return await operation(sftp);
    } finally {
      try {
        await sftp.end();
      } catch (error) {
        console.warn("SFTP 연결 종료 중 오류:", error.message);
      }
    }
  },
};

// IP 주소 기반 접근 제어 미들웨어
const isAllowedIP = (clientIP) => {
  const allowedIPs = process.env.ALLOWED_IPS
    ? process.env.ALLOWED_IPS.split(",")
    : [];

  // 모든 IP 허용 (개발용)
  if (allowedIPs.includes("*")) {
    return true;
  }

  // 특정 IP 체크
  if (allowedIPs.includes(clientIP)) {
    return true;
  }

  return false;
};

// IP 범위 체크 함수
const isIPInRange = (ip, range) => {
  try {
    const [networkIP, prefixLength] = range.split("/");
    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(networkIP);
    const mask = (0xffffffff << (32 - parseInt(prefixLength))) >>> 0;

    return (ipNum & mask) === (networkNum & mask);
  } catch (error) {
    console.error("IP 범위 체크 오류:", error);
    return false;
  }
};

// IP 주소를 숫자로 변환
const ipToNumber = (ip) => {
  return (
    ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
  );
};

// 접근 제어 미들웨어 등록
fastify.addHook("onRequest", async (request, reply) => {
  let clientIP =
    request.ip ||
    request.headers["x-forwarded-for"] ||
    request.headers["x-real-ip"] ||
    request.connection?.remoteAddress ||
    request.socket?.remoteAddress ||
    request.raw?.connection?.remoteAddress ||
    request.raw?.socket?.remoteAddress;

  console.log("clientIP", clientIP);

  // IPv6 형태의 localhost를 IPv4로 변환
  if (clientIP === "::1" || clientIP === "::ffff:127.0.0.1") {
    clientIP = "127.0.0.1";
  }

  // x-forwarded-for 헤더에서 첫 번째 IP 추출 (프록시 통과 시)
  if (clientIP && clientIP.includes(",")) {
    clientIP = clientIP.split(",")[0].trim();
  }

  // IPv6 매핑된 IPv4 주소 처리
  if (clientIP && clientIP.startsWith("::ffff:")) {
    clientIP = clientIP.replace("::ffff:", "");
  }

  if (!isAllowedIP(clientIP)) {
    console.log(`접근 거부 - IP: ${clientIP}`);
    console.log(`요청 URL: ${request.url}`);

    // 일반 페이지 요청인 경우 HTML 페이지 반환 (우선 처리)
    if (!request.url.startsWith("/api/")) {
      console.log("일반 페이지 요청 - HTML 페이지 반환");
      
      const accessDeniedHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>접근 거부 - 응용프로그램 관리 도구</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #fafafa;
            color: #333;
            line-height: 1.5;
            font-size: 14px;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .access-denied-card {
            background: white;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 48px 32px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .warning-icon {
            font-size: 4rem;
            color: #999;
            margin-bottom: 24px;
            display: block;
        }
        .title {
            font-size: 1.5rem;
            font-weight: 500;
            color: #222;
            margin-bottom: 16px;
            letter-spacing: -0.5px;
        }
        .message {
            font-size: 1rem;
            color: #666;
            margin-bottom: 24px;
            line-height: 1.6;
        }
        .ip-info {
            font-family: monospace;
            background: #f0f0f0;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.9rem;
            color: #333;
            margin-top: 12px;
        }
        .retry-btn {
            background: #333;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s ease;
            margin-top: 16px;
        }
        .retry-btn:hover {
            background: #555;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="access-denied-card">
            <div class="warning-icon">⚠️</div>
            <h1 class="title">접근이 거부되었습니다</h1>
            <p class="message">
                죄송합니다. 현재 위치에서는 이 서비스에 접근할 수 없습니다.<br>
                허용된 네트워크에서만 접속이 가능합니다.
            </p>
            <div class="ip-info">현재 IP: ${clientIP}</div>
            <button class="retry-btn" onclick="window.location.reload()">다시 시도</button>
        </div>
    </div>
</body>
</html>`;

      reply.code(403).type("text/html").send(accessDeniedHTML);
      return;
    }

    // API 요청인 경우 JSON 응답
    console.log("API 요청 - JSON 응답");
    reply.code(403).send({
      error: "접근이 거부되었습니다.",
      message: "허용되지 않은 네트워크에서의 접근입니다.",
      clientIP: clientIP,
    });
    return;
  }
});

// 플러그인 등록
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

fastify.register(require("@fastify/multipart"), {
  limits: {
    fileSize: Infinity, // 파일 크기 제한 없음
    files: 1,
    fieldSize: 1024 * 1024, // 1MB for field data
  },
});
fastify.register(require("@fastify/cors"));

// 세션 데이터 저장
const sessions = new Map();

// 다운로드 진행률 저장
const downloadProgress = new Map();

// 임시 파일 정리 함수
const cleanupSession = (sessionId) => {
  const session = sessions.get(sessionId);
  if (session && session.tempDir) {
    fs.removeSync(session.tempDir);
  }
  sessions.delete(sessionId);
  downloadProgress.delete(sessionId);
};

// 클라이언트 IP 확인 API
fastify.get("/api/client-ip", async (request, reply) => {
  let clientIP =
    request.ip ||
    request.headers["x-forwarded-for"] ||
    request.headers["x-real-ip"] ||
    request.connection?.remoteAddress ||
    request.socket?.remoteAddress ||
    request.raw?.connection?.remoteAddress ||
    request.raw?.socket?.remoteAddress;

  // IPv6 형태의 localhost를 IPv4로 변환
  if (clientIP === "::1" || clientIP === "::ffff:127.0.0.1") {
    clientIP = "127.0.0.1";
  }

  // x-forwarded-for 헤더에서 첫 번째 IP 추출 (프록시 통과 시)
  if (clientIP && clientIP.includes(",")) {
    clientIP = clientIP.split(",")[0].trim();
  }

  // IPv6 매핑된 IPv4 주소 처리
  if (clientIP && clientIP.startsWith("::ffff:")) {
    clientIP = clientIP.replace("::ffff:", "");
  }

  return reply.send({
    ip: clientIP || "unknown",
    success: true,
  });
});

// 메인 페이지
fastify.get("/", async (request, reply) => {
  return reply.sendFile("index.html");
});

// ZIP 파일 다운로드 및 압축 해제
fastify.post("/api/download-zip", async (request, reply) => {
  const { url } = request.body;
  const sessionId = uuidv4();

  try {
    // URL 검증
    if (!url || !url.startsWith("http")) {
      return reply.status(400).send({ error: "유효한 URL을 입력해주세요." });
    }

    // 임시 디렉토리 생성
    const tempDir = tmp.dirSync({ unsafeCleanup: true });
    const zipPath = path.join(tempDir.name, "downloaded.zip");
    const extractDir = path.join(tempDir.name, "extracted");

    // 세션 데이터 미리 저장 (진행률 추적을 위해)
    sessions.set(sessionId, {
      tempDir: tempDir.name,
      extractDir,
      files: [],
      folders: [],
    });

    // 즉시 sessionId 응답 후 백그라운드에서 다운로드 처리
    reply.send({
      success: true,
      sessionId,
      message: "다운로드를 시작합니다.",
    });

    // 백그라운드에서 실제 다운로드 및 압축 해제 처리
    processDownload(sessionId, url, zipPath, extractDir).catch((error) => {
      console.error("백그라운드 다운로드 오류:", error);
      downloadProgress.set(sessionId, {
        phase: "error",
        progress: 0,
        error: error.message,
      });
    });
  } catch (error) {
    console.error("ZIP 다운로드 오류:", error);
    return reply.status(500).send({
      error: "ZIP 파일 다운로드 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 백그라운드 다운로드 처리 함수
async function processDownload(sessionId, url, zipPath, extractDir) {
  try {
    // ZIP 파일 다운로드
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      timeout: 30000,
    });

    const totalSize = parseInt(response.headers["content-length"], 10);
    let downloadedSize = 0;

    // 진행률 초기화
    downloadProgress.set(sessionId, {
      phase: "downloading",
      progress: 0,
      totalSize: totalSize,
      downloadedSize: 0,
    });

    const writer = fs.createWriteStream(zipPath);

    response.data.on("data", (chunk) => {
      downloadedSize += chunk.length;
      const progress = totalSize
        ? Math.round((downloadedSize / totalSize) * 100)
        : 0;

      downloadProgress.set(sessionId, {
        phase: "downloading",
        progress: progress,
        totalSize: totalSize,
        downloadedSize: downloadedSize,
      });
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", () => {
        downloadProgress.set(sessionId, {
          phase: "extracting",
          progress: 100,
          totalSize: totalSize,
          downloadedSize: downloadedSize,
        });
        resolve();
      });
      writer.on("error", reject);
    });

    // 압축 해제
    await fs.ensureDir(extractDir);

    await new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);

        zipfile.readEntry();
        zipfile.on("entry", (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // 디렉토리
            zipfile.readEntry();
          } else {
            // 파일
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) return reject(err);

              const filePath = path.join(extractDir, entry.fileName);
              fs.ensureDirSync(path.dirname(filePath));

              const writeStream = fs.createWriteStream(filePath);
              readStream.pipe(writeStream);

              writeStream.on("close", () => {
                zipfile.readEntry();
              });
            });
          }
        });

        zipfile.on("end", resolve);
        zipfile.on("error", reject);
      });
    });

    // 파일 목록 생성
    const { files, folders } = await getFileList(extractDir);

    // 세션 업데이트
    const session = sessions.get(sessionId);
    if (session) {
      session.files = files;
      session.folders = folders;
      sessions.set(sessionId, session);
    }

    // 압축 해제 완료 후 진행률 업데이트
    downloadProgress.set(sessionId, {
      phase: "completed",
      progress: 100,
      totalSize: totalSize,
      downloadedSize: downloadedSize,
      files,
      folders,
    });

    // 10분 후 자동 정리
    setTimeout(() => cleanupSession(sessionId), 10 * 60 * 1000);
  } catch (error) {
    console.error("백그라운드 다운로드 오류:", error);
    downloadProgress.set(sessionId, {
      phase: "error",
      progress: 0,
      error: error.message,
    });
    throw error;
  }
}

// 다운로드 진행률 조회
fastify.get("/api/progress/:sessionId", async (request, reply) => {
  const { sessionId } = request.params;
  const progress = downloadProgress.get(sessionId);

  if (!progress) {
    return reply.status(404).send({ error: "진행률 정보를 찾을 수 없습니다." });
  }

  return reply.send(progress);
});

// 임시 세션 생성
fastify.post("/api/create-session", async (request, reply) => {
  const sessionId = uuidv4();

  // 임시 디렉토리 생성
  const tempDir = tmp.dirSync({ unsafeCleanup: true });
  const extractDir = path.join(tempDir.name, "extracted");
  await fs.ensureDir(extractDir);

  // 세션 데이터 저장
  sessions.set(sessionId, {
    tempDir: tempDir.name,
    extractDir,
    files: [],
    folders: [
      {
        name: "(루트 폴더)",
        path: "",
        type: "folder",
        modified: new Date(),
      },
    ],
  });

  // 10분 후 자동 정리
  setTimeout(() => cleanupSession(sessionId), 10 * 60 * 1000);

  return reply.send({
    success: true,
    sessionId: sessionId,
    message: "세션이 생성되었습니다.",
  });
});

// 파일 목록 조회
fastify.get("/api/files/:sessionId", async (request, reply) => {
  const { sessionId } = request.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return reply.status(404).send({ error: "세션을 찾을 수 없습니다." });
  }

  return reply.send({
    files: session.files,
    folders: session.folders,
  });
});

// 파일 추가 (모든 파일 형식 지원)
fastify.post("/api/add-file", async (request, reply) => {
  try {
    const parts = request.parts();
    let sessionId,
      filename,
      fileBuffer,
      targetFolder = "";

    for await (const part of parts) {
      if (part.fieldname === "sessionId") {
        sessionId = part.value;
      } else if (part.fieldname === "filename") {
        filename = part.value;
      } else if (part.fieldname === "targetFolder") {
        targetFolder = part.value;
      } else if (part.fieldname === "uploadFile") {
        fileBuffer = await part.toBuffer();
      }
    }

    if (!sessionId || !filename || !fileBuffer) {
      return reply.status(400).send({ error: "필수 데이터가 누락되었습니다." });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return reply.status(404).send({ error: "세션을 찾을 수 없습니다." });
    }

    // 파일 크기 제한 제거 (모든 크기 허용)

    // 대상 폴더 경로 구성
    const targetPath = targetFolder
      ? path.join(session.extractDir, targetFolder)
      : session.extractDir;

    // 대상 폴더 존재 확인 및 생성
    await fs.ensureDir(targetPath);

    // 파일 경로
    const filePath = path.join(targetPath, filename);

    // 파일 존재 여부 확인
    const fileExists = await fs.pathExists(filePath);

    // 파일 저장
    await fs.writeFile(filePath, fileBuffer);

    // 파일 목록 업데이트
    const { files, folders } = await getFileList(session.extractDir);
    session.files = files;
    session.folders = folders;

    const action = fileExists ? "덮어씌워" : "추가";
    const location = targetFolder || "루트 폴더";

    return reply.send({
      success: true,
      message: `파일이 성공적으로 ${action}졌습니다. (위치: ${location})`,
      fileExists: fileExists,
      files: session.files,
      folders: session.folders,
    });
  } catch (error) {
    console.error("파일 추가 오류:", error);
    return reply.status(500).send({
      error: "파일 추가 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 파일 존재 여부 확인
fastify.post("/api/check-file-exists", async (request, reply) => {
  try {
    const { sessionId, filename, targetFolder = "" } = request.body;

    if (!sessionId || !filename) {
      return reply.status(400).send({ error: "필수 데이터가 누락되었습니다." });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return reply.status(404).send({ error: "세션을 찾을 수 없습니다." });
    }

    // 파일명 그대로 사용
    let finalFilename = filename;

    // 대상 폴더 경로 구성
    const targetPath = targetFolder
      ? path.join(session.extractDir, targetFolder)
      : session.extractDir;
    const filePath = path.join(targetPath, finalFilename);

    // 파일 존재 여부 확인
    const exists = await fs.pathExists(filePath);

    return reply.send({
      exists: exists,
      filename: finalFilename,
      targetFolder: targetFolder || "루트 폴더",
    });
  } catch (error) {
    console.error("파일 존재 확인 오류:", error);
    return reply.status(500).send({
      error: "파일 존재 확인 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 재압축
fastify.post("/api/recompress", async (request, reply) => {
  const { sessionId, filename = "archive.zip" } = request.body;

  try {
    const session = sessions.get(sessionId);
    if (!session) {
      return reply.status(404).send({ error: "세션을 찾을 수 없습니다." });
    }

    const outputPath = path.join(session.tempDir, filename);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    output.on("close", () => {
      console.log("압축 완료:", archive.pointer() + " bytes");
    });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(session.extractDir, false);

    await archive.finalize();

    // 파일 정보 저장
    session.compressedFile = {
      path: outputPath,
      filename: filename,
      size: fs.statSync(outputPath).size,
    };

    return reply.send({
      success: true,
      message: "파일이 성공적으로 재압축되었습니다.",
      filename: filename,
      size: session.compressedFile.size,
    });
  } catch (error) {
    console.error("재압축 오류:", error);
    return reply.status(500).send({
      error: "재압축 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 파일 다운로드
fastify.get("/api/download/:sessionId/:filename", async (request, reply) => {
  const { sessionId, filename } = request.params;

  try {
    const session = sessions.get(sessionId);
    if (!session || !session.compressedFile) {
      return reply.status(404).send({ error: "파일을 찾을 수 없습니다." });
    }

    const filePath = session.compressedFile.path;
    const fileStream = fs.createReadStream(filePath);

    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);

    return reply.send(fileStream);
  } catch (error) {
    console.error("파일 다운로드 오류:", error);
    return reply.status(500).send({
      error: "파일 다운로드 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// SFTP 서버에 파일 업로드
fastify.post("/api/upload-to-server", async (request, reply) => {
  const { sessionId, remoteFilename } = request.body;

  console.log("SFTP 업로드 요청 받음:", { sessionId, remoteFilename });

  try {
    const session = sessions.get(sessionId);
    if (!session || !session.compressedFile) {
      console.log("세션 또는 압축 파일을 찾을 수 없음:", {
        sessionExists: !!session,
        compressedFileExists: !!(session && session.compressedFile),
      });
      return reply.status(404).send({ error: "압축 파일을 찾을 수 없습니다." });
    }

    const localFilePath = session.compressedFile.path;
    const baseRemotePath = process.env.SFTP_BASE_PATH || "/";
    const filename = remoteFilename || session.compressedFile.filename;
    // 경로 정규화 (중복 슬래시 제거)
    const remotePath = `${baseRemotePath}${
      baseRemotePath.endsWith("/") ? "" : "/"
    }${filename}`.replace(/\/+/g, "/");

    console.log("SFTP 업로드 정보:", { localFilePath, remotePath, filename });

    // SFTP 설정
    const sftpConfig = SftpUtils.createConfig(
      process.env.SFTP_HOST || "localhost",
      process.env.SFTP_USERNAME || "anonymous",
      process.env.SFTP_PASSWORD || "",
      parseInt(process.env.SFTP_PORT) || 22
    );

    console.log("SFTP 설정:", {
      host: sftpConfig.host,
      port: sftpConfig.port,
      username: sftpConfig.username,
    });

    // SFTP 업로드 실행
    const uploadResult = await uploadToSFTPServer(
      localFilePath,
      remotePath,
      sftpConfig
    );

    console.log("SFTP 업로드 성공:", uploadResult);

    // 웹 접근 URL 생성
    const webAccessUrl = process.env.WEB_ACCESS_URL;
    const downloadUrl = webAccessUrl ? `${webAccessUrl}/${filename}` : null;

    return reply.send({
      success: true,
      message: "파일이 성공적으로 SFTP 서버에 업로드되었습니다.",
      remotePath: uploadResult.remotePath,
      fileSize: uploadResult.fileSize,
      downloadUrl: downloadUrl,
      filename: filename,
    });
  } catch (error) {
    console.error("SFTP 업로드 오류:", error);
    console.error("오류 스택:", error.stack);
    return reply.status(500).send({
      error: "SFTP 서버 업로드 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// SFTP 서버 폴더 조회
fastify.get("/api/browse-server/:sessionId", async (request, reply) => {
  try {
    // SFTP 설정
    const sftpConfig = SftpUtils.createConfig(
      process.env.SFTP_HOST || "localhost",
      process.env.SFTP_USERNAME || "anonymous",
      process.env.SFTP_PASSWORD || "",
      parseInt(process.env.SFTP_PORT) || 22
    );

    // 조회할 경로 (쿼리 파라미터에서 받거나 기본 경로 사용)
    const browsePath = request.query.path || process.env.SFTP_BASE_PATH;

    // SFTP 폴더 조회 실행
    const fileList = await browseSFTPDirectory(browsePath, sftpConfig);

    return reply.send({
      success: true,
      path: browsePath,
      files: fileList,
      message: "SFTP 서버 폴더 조회가 완료되었습니다.",
    });
  } catch (error) {
    console.error("SFTP 폴더 조회 오류:", error);
    return reply.status(500).send({
      error: "SFTP 서버 폴더 조회 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// SFTP 연결 테스트
fastify.get("/api/test-ftp-connection", async (request, reply) => {
  console.log("SFTP 연결 테스트 요청 받음");

  try {
    // SFTP 설정
    const sftpConfig = SftpUtils.createConfig(
      process.env.SFTP_HOST || "localhost",
      process.env.SFTP_USERNAME || "anonymous",
      process.env.SFTP_PASSWORD || "",
      parseInt(process.env.SFTP_PORT) || 22
    );

    console.log("SFTP 연결 테스트 설정:", {
      host: sftpConfig.host,
      port: sftpConfig.port,
      username: sftpConfig.username,
    });

    // SFTP 연결 테스트 실행
    const testResult = await testSFTPConnection(sftpConfig);

    return reply.send({
      success: true,
      message: "SFTP 서버 연결이 성공했습니다.",
      details: testResult,
    });
  } catch (error) {
    console.error("SFTP 연결 테스트 오류:", error);
    return reply.status(500).send({
      success: false,
      error: "SFTP 서버 연결에 실패했습니다.",
      details: error.message,
    });
  }
});

// 직접 SFTP 서버 파일 존재 확인 (세션 불필요)
fastify.post("/api/check-direct-server-file", async (request, reply) => {
  const { filename } = request.body;

  console.log("직접 SFTP 파일 존재 확인 요청:", { filename });

  try {
    if (!filename) {
      return reply.status(400).send({ error: "파일명이 누락되었습니다." });
    }

    const baseRemotePath = process.env.SFTP_BASE_PATH || "/";
    const remotePath = `${baseRemotePath}${
      baseRemotePath.endsWith("/") ? "" : "/"
    }${filename}`.replace(/\/+/g, "/");

    // SFTP 설정
    const sftpConfig = SftpUtils.createConfig(
      process.env.SFTP_HOST || "localhost",
      process.env.SFTP_USERNAME || "anonymous",
      process.env.SFTP_PASSWORD || "",
      parseInt(process.env.SFTP_PORT) || 22
    );

    // SFTP 서버에서 파일 존재 확인
    const fileExists = await checkSFTPFileExists(remotePath, sftpConfig);

    return reply.send({
      success: true,
      exists: fileExists,
      filename: filename,
      remotePath: remotePath,
    });
  } catch (error) {
    console.error("직접 SFTP 파일 존재 확인 오류:", error);
    return reply.status(500).send({
      error: "SFTP 서버 파일 확인 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 직접 SFTP 서버 업로드 (세션 불필요)
fastify.post("/api/direct-upload-to-server", async (request, reply) => {
  console.log("직접 SFTP 업로드 요청 받음");

  try {
    const parts = request.parts();
    let filename, fileBuffer;

    for await (const part of parts) {
      if (part.fieldname === "filename") {
        filename = part.value;
      } else if (part.fieldname === "uploadFile") {
        fileBuffer = await part.toBuffer();
      }
    }

    if (!filename || !fileBuffer) {
      return reply.status(400).send({ error: "필수 데이터가 누락되었습니다." });
    }

    console.log("직접 업로드 정보:", { filename, fileSize: fileBuffer.length });

    // 임시 파일 생성 (안전한 파일명 사용)
    const tempDir = tmp.dirSync({ unsafeCleanup: true });
    const safeFilename = `upload_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    const tempFilePath = path.join(tempDir.name, safeFilename);
    await fs.writeFile(tempFilePath, fileBuffer);

    const baseRemotePath = process.env.SFTP_BASE_PATH || "/";
    // 경로 정규화 (중복 슬래시 제거)
    const remotePath = `${baseRemotePath}${
      baseRemotePath.endsWith("/") ? "" : "/"
    }${filename}`.replace(/\/+/g, "/");

    console.log("SFTP 업로드 정보:", { tempFilePath, remotePath, filename });

    // SFTP 설정
    const sftpConfig = SftpUtils.createConfig(
      process.env.SFTP_HOST || "localhost",
      process.env.SFTP_USERNAME || "anonymous",
      process.env.SFTP_PASSWORD || "",
      parseInt(process.env.SFTP_PORT) || 22
    );

    console.log("SFTP 설정:", {
      host: sftpConfig.host,
      port: sftpConfig.port,
      username: sftpConfig.username,
    });

    // SFTP 업로드 실행
    const uploadResult = await uploadToSFTPServer(
      tempFilePath,
      remotePath,
      sftpConfig
    );

    console.log("직접 SFTP 업로드 성공:", uploadResult);

    // 임시 파일 정리
    fs.removeSync(tempDir.name);

    // 웹 접근 URL 생성
    const webAccessUrl = process.env.WEB_ACCESS_URL;
    const downloadUrl = webAccessUrl ? `${webAccessUrl}/${filename}` : null;

    return reply.send({
      success: true,
      message: "파일이 성공적으로 SFTP 서버에 업로드되었습니다.",
      remotePath: uploadResult.remotePath,
      fileSize: uploadResult.fileSize,
      downloadUrl: downloadUrl,
      filename: filename,
    });
  } catch (error) {
    console.error("직접 SFTP 업로드 오류:", error);
    console.error("오류 스택:", error.stack);
    return reply.status(500).send({
      error: "SFTP 서버 업로드 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// SFTP 서버 파일 존재 확인
fastify.post("/api/check-server-file", async (request, reply) => {
  const { sessionId, filename } = request.body;

  console.log("SFTP 파일 존재 확인 요청:", { sessionId, filename });

  try {
    const session = sessions.get(sessionId);
    if (!session || !session.compressedFile) {
      return reply.status(404).send({ error: "압축 파일을 찾을 수 없습니다." });
    }

    const baseRemotePath = process.env.SFTP_BASE_PATH || "/";
    const remotePath = `${baseRemotePath}${
      baseRemotePath.endsWith("/") ? "" : "/"
    }${filename}`.replace(/\/+/g, "/");

    // SFTP 설정
    const sftpConfig = SftpUtils.createConfig(
      process.env.SFTP_HOST || "localhost",
      process.env.SFTP_USERNAME || "anonymous",
      process.env.SFTP_PASSWORD || "",
      parseInt(process.env.SFTP_PORT) || 22
    );

    // SFTP 서버에서 파일 존재 확인
    const fileExists = await checkSFTPFileExists(remotePath, sftpConfig);

    return reply.send({
      success: true,
      exists: fileExists,
      filename: filename,
      remotePath: remotePath,
    });
  } catch (error) {
    console.error("SFTP 파일 존재 확인 오류:", error);
    return reply.status(500).send({
      error: "SFTP 서버 파일 확인 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// SFTP 서버 파일 삭제
fastify.post("/api/delete-server-file", async (request, reply) => {
  const { filename } = request.body;

  console.log("SFTP 파일 삭제 요청:", { filename });

  try {
    if (!filename) {
      return reply.status(400).send({ error: "파일명이 누락되었습니다." });
    }

    const baseRemotePath = process.env.SFTP_BASE_PATH || "/";
    const remotePath = `${baseRemotePath}${
      baseRemotePath.endsWith("/") ? "" : "/"
    }${filename}`.replace(/\/+/g, "/");

    // SFTP 설정
    const sftpConfig = SftpUtils.createConfig(
      process.env.SFTP_HOST || "localhost",
      process.env.SFTP_USERNAME || "anonymous",
      process.env.SFTP_PASSWORD || "",
      parseInt(process.env.SFTP_PORT) || 22
    );

    // SFTP 서버에서 파일 삭제
    const deleteResult = await deleteFromSFTPServer(remotePath, sftpConfig);

    return reply.send({
      success: true,
      message: `파일 '${filename}'이 성공적으로 삭제되었습니다.`,
      filename: filename,
      remotePath: remotePath,
    });
  } catch (error) {
    console.error("SFTP 파일 삭제 오류:", error);
    return reply.status(500).send({
      error: "SFTP 서버 파일 삭제 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// SFTP 폴더 조회 함수
async function browseSFTPDirectory(remotePath, sftpConfig) {
  return SftpUtils.executeWithClient(sftpConfig, async (sftp) => {
    console.log("SFTP 연결 성공 (조회)");

    const list = await sftp.list(remotePath);

    // 파일 목록 정리
    const fileList = list
      .filter((item) => ![".", ".."].includes(item.name))
      .map((item) => ({
        name: item.name,
        type: item.type === "d" ? "directory" : "file",
        size: item.size || 0,
        date: item.modifyTime ? new Date(item.modifyTime) : new Date(),
        permissions: item.rights
          ? item.rights.user + item.rights.group + item.rights.other
          : item.type === "d"
          ? "drwxr-xr-x"
          : "-rw-r--r--",
      }));

    console.log(
      `SFTP 폴더 조회 완료: ${remotePath} (${fileList.length}개 항목)`
    );
    return fileList;
  });
}

// SFTP 파일 존재 확인 함수
async function checkSFTPFileExists(remotePath, sftpConfig) {
  try {
    return await SftpUtils.executeWithClient(sftpConfig, async (sftp) => {
      console.log("SFTP 연결 성공 (파일 확인)");

      try {
        const stats = await sftp.stat(remotePath);
        console.log(
          `SFTP 파일 존재 확인: ${remotePath} - 있음 (${stats.size} bytes)`
        );
        return true;
      } catch (err) {
        // 파일이 없거나 접근할 수 없는 경우
        console.log(`SFTP 파일 존재 확인: ${remotePath} - 없음`);
        return false;
      }
    });
  } catch (error) {
    console.error("SFTP 연결 오류 (파일 확인):", error);
    // 연결 오류 시에도 파일이 없는 것으로 간주
    return false;
  }
}

// SFTP 업로드 함수
async function uploadToSFTPServer(localFilePath, remotePath, sftpConfig) {
  return SftpUtils.executeWithClient(sftpConfig, async (sftp) => {
    console.log("SFTP 연결 성공 (업로드)");

    // 로컬 파일 존재 확인
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`로컬 파일을 찾을 수 없습니다: ${localFilePath}`);
    }

    console.log(`파일 업로드 시작: ${localFilePath} -> ${remotePath}`);

    // 파일 업로드
    await sftp.put(localFilePath, remotePath);

    const fileStats = fs.statSync(localFilePath);

    console.log(`파일 업로드 완료: ${remotePath} (${fileStats.size} bytes)`);

    return {
      remotePath: remotePath,
      fileSize: fileStats.size,
    };
  });
}

// SFTP 연결 테스트 함수
async function testSFTPConnection(sftpConfig) {
  return SftpUtils.executeWithClient(sftpConfig, async (sftp) => {
    console.log("SFTP 연결 성공 (테스트)");

    try {
      const dir = await sftp.pwd();
      console.log("현재 디렉토리:", dir);
      return {
        connected: true,
        message: "SFTP 서버 연결이 성공했습니다.",
        currentDir: dir,
      };
    } catch (err) {
      console.warn("PWD 명령 오류, 기본 경로 사용:", err.message);
      return {
        connected: true,
        message: "SFTP 서버 연결이 성공했습니다.",
        currentDir: "/",
      };
    }
  });
}

// SFTP 파일 삭제 함수
async function deleteFromSFTPServer(remotePath, sftpConfig) {
  return SftpUtils.executeWithClient(sftpConfig, async (sftp) => {
    console.log("SFTP 연결 성공 (삭제)");

    // 파일 존재 확인
    try {
      await sftp.stat(remotePath);
    } catch (err) {
      throw new Error(`파일을 찾을 수 없습니다: ${remotePath}`);
    }

    console.log(`파일 삭제 시작: ${remotePath}`);

    // 파일 삭제
    await sftp.delete(remotePath);

    console.log(`파일 삭제 완료: ${remotePath}`);

    return {
      remotePath: remotePath,
      deleted: true,
    };
  });
}

// 파일 목록 생성 함수 (폴더 구조 포함)
async function getFileList(dir) {
  const files = [];
  const folders = [];

  async function walk(currentPath, relativePath = "") {
    const items = await fs.readdir(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = await fs.stat(itemPath);
      const relativeItemPath = path.join(relativePath, item);

      if (stat.isDirectory()) {
        folders.push({
          name: item,
          path: relativeItemPath,
          type: "folder",
          modified: stat.mtime,
        });
        await walk(itemPath, relativeItemPath);
      } else {
        files.push({
          name: item,
          path: relativeItemPath,
          type: "file",
          size: stat.size,
          modified: stat.mtime,
        });
      }
    }
  }

  await walk(dir);

  // 루트 폴더 추가
  folders.unshift({
    name: "(루트 폴더)",
    path: "",
    type: "folder",
    modified: new Date(),
  });

  return { files, folders };
}

// 서버 시작
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    await fastify.listen({ port: port, host: "0.0.0.0" });
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
