class ZipPdfManager {
  constructor() {
    this.sessionId = null;
    this.currentStep = 1;
    this.selectedFile = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.showStep(1);
  }

  setupEventListeners() {
    // 1단계: ZIP 다운로드
    document.getElementById("downloadBtn").addEventListener("click", () => {
      this.downloadZip();
    });

    // FTP 연결 테스트
    document.getElementById("testFtpBtn").addEventListener("click", () => {
      this.testFtpConnection();
    });

    // 3단계: 파일 업로드
    this.setupFileUpload();

    // PDF 추가 버튼
    document.getElementById("addFileBtn").addEventListener("click", () => {
      this.addFile();
    });

    // 4단계: 재압축
    document.getElementById("recompressBtn").addEventListener("click", () => {
      this.recompressFiles();
    });

    // 최종 다운로드
    document
      .getElementById("finalDownloadBtn")
      .addEventListener("click", () => {
        this.downloadFinalFile();
      });

    // FTP 서버 업로드 버튼
    document
      .getElementById("uploadToServerBtn")
      .addEventListener("click", () => {
        this.setDefaultRemoteFilename();
        this.showStep(5);
        // 페이지 진입 시 자동으로 서버 폴더 조회
        setTimeout(() => {
          this.browseServerFolder();
        }, 100);
      });

    // 서버 업로드
    document.getElementById("uploadBtn").addEventListener("click", () => {
      this.uploadToServer();
    });

    // 서버 폴더 조회 버튼이 존재하는 경우에만 이벤트 리스너 추가
    const browseServerBtn = document.getElementById("browseServerBtn");
    if (browseServerBtn) {
      browseServerBtn.addEventListener("click", () => {
        this.browseServerFolder();
      });
    }

    // 파일명 입력 검증
    document.getElementById("filename").addEventListener("input", () => {
      this.validateFileForm();
    });

    // 폴더 선택 검증
    document.getElementById("targetFolder").addEventListener("change", () => {
      this.validateFileForm();
    });
  }

  async testFtpConnection() {
    const testBtn = document.getElementById("testFtpBtn");
    testBtn.disabled = true;
    testBtn.textContent = "연결 테스트 중...";

    try {
      const response = await fetch("/api/test-ftp-connection");
      const data = await response.json();

      if (response.ok && data.success) {
        alert(`✅ ${data.message}\n현재 디렉토리: ${data.details.currentDir}`);
      } else {
        this.showError(`❌ FTP 연결 실패: ${data.details || data.error}`);
      }
    } catch (error) {
      console.error("FTP 연결 테스트 오류:", error);
      this.showError(`❌ FTP 연결 테스트 실패: ${error.message}`);
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = "FTP 연결 테스트";
    }
  }

  setupFileUpload() {
    const fileUploadArea = document.getElementById("fileUploadArea");
    const fileInput = document.getElementById("fileInput");

    // 클릭으로 파일 선택
    fileUploadArea.addEventListener("click", () => {
      fileInput.click();
    });

    // 파일 선택 처리
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFileSelect(file);
      }
    });

    // 드래그 앤 드롭 처리
    fileUploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      fileUploadArea.classList.add("drag-over");
    });

    fileUploadArea.addEventListener("dragleave", () => {
      fileUploadArea.classList.remove("drag-over");
    });

    fileUploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      fileUploadArea.classList.remove("drag-over");

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelect(files[0]);
      }
    });
  }

  handleFileSelect(file) {
    // 파일 크기 제한 제거 (모든 크기 허용)

    this.selectedFile = file;
    this.updateFileDisplay(file);

    // 파일명 필드에 원본 파일명 설정 (확장자 포함)
    document.getElementById("filename").value = file.name;

    this.validateFileForm();
  }

  updateFileDisplay(file) {
    const fileUploadArea = document.getElementById("fileUploadArea");
    const fileSize = this.formatFileSize(file.size);

    fileUploadArea.innerHTML = `
            <div class="file-info">
                <h4>선택된 파일</h4>
                <p><strong>파일명:</strong> ${file.name}</p>
                <p><strong>크기:</strong> ${fileSize}</p>
                <p><strong>타입:</strong> ${file.type}</p>
            </div>
        `;
  }

  validateFileForm() {
    const filename = document.getElementById("filename").value.trim();
    const targetFolder = document.getElementById("targetFolder").value;
    const addBtn = document.getElementById("addFileBtn");

    if (filename && this.selectedFile && targetFolder !== "") {
      addBtn.disabled = false;
    } else {
      addBtn.disabled = true;
    }
  }

  async downloadZip() {
    const url = document.getElementById("zipUrl").value.trim();

    if (!url) {
      this.showError("ZIP 파일 URL을 입력해주세요.");
      return;
    }

    this.showProgress("downloadProgress", "다운로드 중...");

    try {
      // 다운로드 요청을 백그라운드에서 시작
      const downloadPromise = this.startDownloadWithProgress(url);
      const data = await downloadPromise;

      if (data.success) {
        this.sessionId = data.sessionId;
        this.showStatus(data.message);
        // 진행률 폴링을 통해 완료되면 다음 단계로 진행
        this.waitForCompletion(data.sessionId, url);
      } else {
        this.showError(data.error || "다운로드 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("다운로드 오류:", error);
      this.showError("서버와 통신 중 오류가 발생했습니다.");
      this.hideProgress("downloadProgress");
    }
  }

  // 다운로드 완료를 기다리는 함수
  async waitForCompletion(sessionId, url) {
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/progress/${sessionId}`);
        if (response.ok) {
          const progressData = await response.json();

          if (
            progressData.phase === "completed" &&
            progressData.files &&
            progressData.folders
          ) {
            clearInterval(checkInterval);

            // 완료되면 파일 목록 표시하고 다음 단계로 진행
            this.displayFileList(progressData.files);
            this.populateFolderOptions(progressData.folders);
            this.setDefaultOutputFilename(url);
            this.showStatus(
              "ZIP 파일이 성공적으로 다운로드되고 압축 해제되었습니다."
            );
            this.showStep(2);
            setTimeout(() => this.showStep(3), 1000);
            this.hideProgress("downloadProgress");
          } else if (progressData.phase === "error") {
            clearInterval(checkInterval);
            this.showError(
              progressData.error || "다운로드 중 오류가 발생했습니다."
            );
            this.hideProgress("downloadProgress");
          }
        }
      } catch (error) {
        console.error("완료 확인 오류:", error);
        clearInterval(checkInterval);
        this.hideProgress("downloadProgress");
      }
    }, 1000); // 1초마다 확인

    // 5분 후 타임아웃
    setTimeout(() => {
      clearInterval(checkInterval);
      this.showError("다운로드 시간이 초과되었습니다.");
      this.hideProgress("downloadProgress");
    }, 5 * 60 * 1000);
  }

  // 다운로드와 진행률 추적을 함께 처리하는 함수
  async startDownloadWithProgress(url) {
    // 먼저 다운로드 요청을 시작하고 sessionId를 받음
    const response = await fetch("/api/download-zip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (data.success) {
      // sessionId를 받자마자 진행률 추적 시작
      this.pollProgress(data.sessionId);
    }

    return data;
  }

  // 진행률 폴링 함수
  async pollProgress(sessionId) {
    if (!sessionId) return;

    const progressInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/progress/${sessionId}`);
        if (response.ok) {
          const progressData = await response.json();
          this.updateProgress("downloadProgress", progressData);

          if (progressData.phase === "completed") {
            clearInterval(progressInterval);
          }
        } else {
          clearInterval(progressInterval);
        }
      } catch (error) {
        console.error("진행률 확인 오류:", error);
        clearInterval(progressInterval);
      }
    }, 500); // 0.5초마다 확인

    // 30초 후 자동 정리
    setTimeout(() => clearInterval(progressInterval), 30000);
  }

  // 진행률 업데이트 함수
  updateProgress(containerId, progressData) {
    const container = document.getElementById(containerId);
    const progressFill = container.querySelector(".progress-fill");
    const progressText = container.querySelector(".progress-text");

    if (progressFill) {
      progressFill.style.width = `${progressData.progress}%`;
    }

    if (progressText) {
      let text = "";
      switch (progressData.phase) {
        case "downloading":
          text = `다운로드 중... ${progressData.progress}%`;
          if (progressData.totalSize) {
            const mbDownloaded = (
              progressData.downloadedSize /
              1024 /
              1024
            ).toFixed(1);
            const mbTotal = (progressData.totalSize / 1024 / 1024).toFixed(1);
            text += ` (${mbDownloaded}MB / ${mbTotal}MB)`;
          }
          break;
        case "extracting":
          text = "압축 해제 중...";
          break;
        case "completed":
          text = "완료";
          break;
        default:
          text = "처리 중...";
      }
      progressText.textContent = text;
    }
  }

  displayFileList(files) {
    const fileList = document.getElementById("fileList");

    if (!files || files.length === 0) {
      fileList.innerHTML = "<p>압축 해제된 파일이 없습니다.</p>";
      return;
    }

    const fileItems = files
      .map((file) => {
        const fileSize = this.formatFileSize(file.size);
        const fileDate = new Date(file.modified).toLocaleDateString();

        return `
                <div class="file-item">
                    <div class="file-name">${file.name}</div>
                    <div class="file-details">
                        <span class="file-size">${fileSize}</span>
                        <span class="file-date">${fileDate}</span>
                    </div>
                </div>
            `;
      })
      .join("");

    fileList.innerHTML = `
            <h3>총 ${files.length}개의 파일</h3>
            ${fileItems}
        `;
  }

  populateFolderOptions(folders) {
    const folderSelect = document.getElementById("targetFolder");

    // 기존 옵션 제거 (첫 번째 옵션 제외)
    while (folderSelect.children.length > 1) {
      folderSelect.removeChild(folderSelect.lastChild);
    }

    // 폴더 옵션 추가
    folders.forEach((folder) => {
      const option = document.createElement("option");
      option.value = folder.path;
      option.textContent = folder.name;

      // 루트 폴더 특별 처리
      if (folder.path === "") {
        option.textContent = folder.name;
      } else {
        // 중첩 깊이에 따라 들여쓰기
        const depth = folder.path.split("/").length - 1;
        const indent = "  ".repeat(depth);
        option.textContent = `${indent}${folder.name}`;
      }

      folderSelect.appendChild(option);
    });

    // 하위 폴더를 기본으로 선택 (루트 폴더가 아닌 첫 번째 하위 폴더)
    let selectedIndex = 0; // 기본값: "폴더를 선택하세요"

    // 루트 폴더가 아닌 첫 번째 하위 폴더 찾기
    for (let i = 1; i < folderSelect.children.length; i++) {
      const optionValue = folderSelect.children[i].value;
      // 빈 문자열이 아닌 첫 번째 폴더 (실제 하위 폴더)
      if (optionValue !== "") {
        selectedIndex = i;
        break;
      }
    }

    folderSelect.selectedIndex = selectedIndex;

    // 폼 검증 상태 업데이트
    this.validateFileForm();
  }

  setDefaultOutputFilename(url) {
    try {
      // URL에서 파일명 추출
      const urlParts = url.split("/");
      const filename = urlParts[urlParts.length - 1];

      // .zip 확장자 제거하고 파일명 추출
      const nameWithoutExtension = filename.replace(/\.zip$/i, "");

      // 출력 파일명 설정
      const outputFilename = `${nameWithoutExtension}.zip`;

      // 4단계 출력 파일명 필드에 설정
      document.getElementById("outputFilename").value = outputFilename;
    } catch (error) {
      console.error("파일명 추출 오류:", error);
      // 오류 시 기본값 유지
      document.getElementById("outputFilename").value = "archive.zip";
    }
  }

  async addFile() {
    const filename = document.getElementById("filename").value.trim();
    const targetFolder = document.getElementById("targetFolder").value;

    if (!filename || !this.selectedFile || targetFolder === "") {
      this.showError("파일명, 파일, 저장 폴더를 모두 선택해주세요.");
      return;
    }

    // 파일 존재 여부 확인
    try {
      const checkResponse = await fetch("/api/check-file-exists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          filename: filename,
          targetFolder: targetFolder,
        }),
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();

        if (checkData.exists) {
          const confirmOverwrite = confirm(
            `"${checkData.filename}" 파일이 ${checkData.targetFolder}에 이미 존재합니다.\n\n기존 파일을 덮어씌우시겠습니까?`
          );

          if (!confirmOverwrite) {
            return; // 사용자가 취소한 경우 함수 종료
          }
        }
      }
    } catch (error) {
      console.error("파일 존재 확인 오류:", error);
      // 확인 실패 시에도 계속 진행
    }

    const formData = new FormData();
    formData.append("sessionId", this.sessionId);
    formData.append("filename", filename);
    formData.append("targetFolder", targetFolder);
    formData.append("uploadFile", this.selectedFile);

    try {
      const addBtn = document.getElementById("addFileBtn");
      const originalText = addBtn.textContent;
      addBtn.textContent = "추가 중...";
      addBtn.disabled = true;

      const response = await fetch("/api/add-file", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        this.showStatus(data.message);
        this.displayFileList(data.files);
        if (data.folders) {
          this.populateFolderOptions(data.folders);
        }
        this.showStep(4);
      } else {
        this.showError(data.error || "PDF 추가 중 오류가 발생했습니다.");
      }

      addBtn.textContent = originalText;
      addBtn.disabled = false;
    } catch (error) {
      console.error("PDF 추가 오류:", error);
      this.showError("서버와 통신 중 오류가 발생했습니다.");
    }
  }

  async recompressFiles() {
    const filename = document.getElementById("outputFilename").value.trim();

    if (!filename) {
      this.showError("출력 파일명을 입력해주세요.");
      return;
    }

    this.showProgress("recompressProgress", "압축 중...");

    try {
      const response = await fetch("/api/recompress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          filename: filename,
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.showStatus(data.message);
        this.showDownloadResult(data.filename, data.size);
      } else {
        this.showError(data.error || "압축 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("압축 오류:", error);
      this.showError("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      this.hideProgress("recompressProgress");
    }
  }

  showDownloadResult(filename, size) {
    const resultContainer = document.getElementById("downloadResult");
    const finalDownloadBtn = document.getElementById("finalDownloadBtn");

    finalDownloadBtn.setAttribute("data-filename", filename);

    const formattedSize = this.formatFileSize(size);
    resultContainer.querySelector(
      ".success-message p"
    ).textContent = `파일이 성공적으로 재압축되었습니다. (${formattedSize})`;

    resultContainer.classList.remove("hidden");
  }

  downloadFinalFile() {
    const filename = document
      .getElementById("finalDownloadBtn")
      .getAttribute("data-filename");
    const downloadUrl = `/api/download/${this.sessionId}/${filename}`;

    // 링크 생성 및 클릭으로 다운로드
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showStatus("다운로드가 시작되었습니다.");
  }

  showStep(stepNumber) {
    // 모든 단계 숨기기
    document.querySelectorAll(".step").forEach((step) => {
      step.classList.remove("active");
    });

    // 현재 단계 표시
    const currentStep = document.getElementById(`step${stepNumber}`);
    if (currentStep) {
      currentStep.classList.add("active");
    }

    this.currentStep = stepNumber;
  }

  showProgress(progressId, message) {
    const progressContainer = document.getElementById(progressId);
    const progressText = progressContainer.querySelector(".progress-text");

    progressText.textContent = message;
    progressContainer.classList.remove("hidden");

    // 진행률 애니메이션
    const progressFill = progressContainer.querySelector(".progress-fill");
    progressFill.style.width = "100%";
  }

  hideProgress(progressId) {
    const progressContainer = document.getElementById(progressId);
    progressContainer.classList.add("hidden");

    // 진행률 리셋
    const progressFill = progressContainer.querySelector(".progress-fill");
    progressFill.style.width = "0%";
  }

  showStatus(message) {
    const statusMessage = document.getElementById("statusMessage");
    statusMessage.textContent = message;
    statusMessage.classList.remove("hidden");

    // 3초 후 자동 숨김
    setTimeout(() => {
      statusMessage.classList.add("hidden");
    }, 3000);
  }

  showError(message) {
    const errorMessage = document.getElementById("errorMessage");
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");

    // 5초 후 자동 숨김
    setTimeout(() => {
      errorMessage.classList.add("hidden");
    }, 5000);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // FTP 서버 폴더 조회
  async browseServerFolder() {
    if (!this.sessionId) {
      this.showError("세션 정보가 없습니다.");
      return;
    }

    const browseBtn = document.getElementById("browseServerBtn");
    let originalText = "";

    // 버튼이 존재하는 경우에만 상태 변경
    if (browseBtn) {
      originalText = browseBtn.textContent;
      browseBtn.textContent = "조회 중...";
      browseBtn.disabled = true;
    }

    try {
      const response = await fetch(`/api/browse-server/${this.sessionId}`);
      const data = await response.json();

      if (data.success) {
        this.displayServerFileList(data);
        this.showStatus("FTP 서버 폴더 조회가 완료되었습니다.");
      } else {
        this.showError(data.error || "서버 폴더 조회 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("서버 폴더 조회 오류:", error);
      this.showError("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      // 버튼이 존재하는 경우에만 상태 복원
      if (browseBtn) {
        browseBtn.textContent = originalText;
        browseBtn.disabled = false;
      }
    }
  }

  // 서버 파일 목록 표시
  displayServerFileList(data) {
    const serverFileList = document.getElementById("serverFileList");
    const serverFiles = document.getElementById("serverFiles");

    if (!data.files || data.files.length === 0) {
      serverFiles.innerHTML = "<p>폴더가 비어있습니다.</p>";
      serverFileList.classList.remove("hidden");
      return;
    }

    const fileItems = data.files
      .map((file) => {
        const fileSize =
          file.type === "file" ? this.formatFileSize(file.size) : "";
        const fileDate = new Date(file.date).toLocaleDateString();
        const fileType = file.type === "directory" ? "[폴더]" : "[파일]";

        return `
          <div class="file-item">
            <div class="file-name">${fileType} ${file.name}</div>
            <div class="file-details">
              ${
                file.type === "file"
                  ? `<span class="file-size">${fileSize}</span>`
                  : ""
              }
              <span class="file-date">${fileDate}</span>
            </div>
          </div>
        `;
      })
      .join("");

    serverFiles.innerHTML = fileItems;
    serverFileList.classList.remove("hidden");
  }

  // FTP 서버에 업로드
  async uploadToServer() {
    if (!this.sessionId) {
      this.showError("세션 정보가 없습니다.");
      return;
    }

    const remoteFilename = document
      .getElementById("remoteFilename")
      .value.trim();

    console.log("FTP 업로드 시작:", {
      sessionId: this.sessionId,
      remoteFilename,
    });

    // 기본 파일명 결정
    const outputFilename = document
      .getElementById("outputFilename")
      .value.trim();
    const finalFilename = remoteFilename || outputFilename;

    if (!finalFilename) {
      this.showError("업로드할 파일명을 확인할 수 없습니다.");
      return;
    }

    try {
      // 1단계: 서버에 동일한 파일이 있는지 확인
      console.log("FTP 파일 존재 확인 중...");
      const checkResponse = await fetch("/api/check-server-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          filename: finalFilename,
        }),
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        console.log("FTP 파일 존재 확인 결과:", checkData);

        if (checkData.exists) {
          const confirmOverwrite = confirm(
            `"${finalFilename}" 파일이 FTP 서버에 이미 존재합니다.\n\n기존 파일을 덮어씌우시겠습니까?`
          );

          if (!confirmOverwrite) {
            return; // 사용자가 취소한 경우 업로드 중단
          }
        }
      } else {
        console.warn("파일 존재 확인 실패, 업로드 계속 진행");
      }

      // 2단계: 실제 업로드 진행
      this.showProgress("uploadProgress", "FTP 서버에 업로드 중...");

      const response = await fetch("/api/upload-to-server", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          remoteFilename: remoteFilename || undefined,
        }),
      });

      console.log("FTP 업로드 응답 상태:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("FTP 업로드 HTTP 오류:", response.status, errorText);
        this.showError(`서버 오류 (${response.status}): ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log("FTP 업로드 응답 데이터:", data);

      if (data.success) {
        this.showUploadResult(data);
      } else {
        console.error("FTP 업로드 실패:", data);
        this.showError(data.error || "서버 업로드 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("서버 업로드 오류:", error);
      this.showError(`서버와 통신 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      this.hideProgress("uploadProgress");
    }
  }

  // 업로드 결과 표시
  showUploadResult(data) {
    console.log("data", data);
    const uploadResult = document.getElementById("uploadResult");
    const uploadMessage = document.getElementById("uploadMessage");

    const fileSize = this.formatFileSize(data.fileSize);

    let downloadLinkHtml = "";
    if (data.downloadUrl) {
      downloadLinkHtml = `
        <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
          <strong>다운로드 링크:</strong><br>
          <a href="${
            data.downloadUrl
          }" target="_blank" style="color: #007bff; text-decoration: none; font-weight: 500;">
            ${data.filename || data.remotePath.split("/").pop()}
          </a>
          <br>
          <small style="color: #666;">클릭하여 파일 다운로드</small>
        </div>
      `;
    }

    uploadMessage.innerHTML = `
      파일 크기: ${fileSize}<br>
      <small style="color: #666;">업로드된 파일명: ${data.remotePath
        .split("/")
        .pop()}</small>
      ${downloadLinkHtml}
    `;

    uploadResult.classList.remove("hidden");
    this.showStatus("FTP 서버에 성공적으로 업로드되었습니다.");
  }

  // 서버 파일명 기본값 설정
  setDefaultRemoteFilename() {
    // 출력 파일명에서 기본값 가져오기
    const outputFilename = document
      .getElementById("outputFilename")
      .value.trim();
    if (outputFilename) {
      const remoteFilenameInput = document.getElementById("remoteFilename");
      remoteFilenameInput.value = outputFilename;
    }
  }
}

// 애플리케이션 초기화
document.addEventListener("DOMContentLoaded", () => {
  new ZipPdfManager();
});
