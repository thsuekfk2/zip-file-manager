const fastify = require("fastify")({ logger: true });
const path = require("path");
const fs = require("fs-extra");
const axios = require("axios");
const yauzl = require("yauzl");
const archiver = require("archiver");
const tmp = require("tmp");
const { v4: uuidv4 } = require("uuid");

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

// 임시 파일 정리 함수
const cleanupSession = (sessionId) => {
  const session = sessions.get(sessionId);
  if (session && session.tempDir) {
    fs.removeSync(session.tempDir);
  }
  sessions.delete(sessionId);
};

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

    // ZIP 파일 다운로드
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      timeout: 30000,
    });

    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
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

    // 세션 저장
    sessions.set(sessionId, {
      tempDir: tempDir.name,
      extractDir,
      files,
      folders,
    });

    // 10분 후 자동 정리
    setTimeout(() => cleanupSession(sessionId), 10 * 60 * 1000);

    return reply.send({
      success: true,
      sessionId,
      files,
      folders,
      message: "ZIP 파일이 성공적으로 다운로드되고 압축 해제되었습니다.",
    });
  } catch (error) {
    console.error("ZIP 다운로드 오류:", error);
    return reply.status(500).send({
      error: "ZIP 파일 다운로드 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
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
