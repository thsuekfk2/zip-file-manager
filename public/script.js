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

    // 압축 건너뛰기 버튼들
    document.getElementById("skipToUploadBtn").addEventListener("click", () => {
      this.skipToServerBrowse();
    });

    // 직접 업로드 관련
    document.getElementById("directFile").addEventListener("change", (e) => {
      this.handleDirectFileSelect(e);
    });

    // 직접 업로드 파일 영역 설정
    this.setupDirectFileUpload();

    // 서버 파일 업로드 영역 설정
    this.setupServerFileUpload();


    document.getElementById("directUploadBtn").addEventListener("click", () => {
      this.directUpload();
    });

    document.getElementById("backToMainBtn").addEventListener("click", () => {
      this.backToMain();
    });

    // 뒤로 가기 버튼들
    document.getElementById("backToStep1").addEventListener("click", () => {
      this.showStep(1);
    });

    document.getElementById("backToStep2").addEventListener("click", () => {
      this.showStep(2);
    });

    document.getElementById("backToStep3").addEventListener("click", () => {
      this.showStep(3);
    });

    document.getElementById("backToStep4").addEventListener("click", () => {
      this.showStep(4);
    });

    // 재압축된 파일 업로드 관련
    document
      .getElementById("compressedUploadBtn")
      .addEventListener("click", () => {
        this.uploadToServer();
      });

    // 서버 파일 업로드 관련
    document.getElementById("serverFile").addEventListener("change", (e) => {
      this.handleServerFileSelect(e);
    });

    document.getElementById("serverUploadBtn").addEventListener("click", () => {
      this.serverFileUpload();
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
        // 재압축된 파일 업로드 섹션 보이기
        document.querySelector('.compressed-file-upload-section').classList.remove('hidden');
        // 서버 파일 업로드 섹션 숨기기
        document.querySelector('.server-upload-section').classList.add('hidden');
        // 페이지 진입 시 자동으로 서버 폴더 조회
        setTimeout(() => {
          this.browseServerFolder();
        }, 100);
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

  setupDirectFileUpload() {
    const directFileUploadArea = document.getElementById(
      "directFileUploadArea"
    );
    const directFileInput = document.getElementById("directFile");

    if (!directFileUploadArea || !directFileInput) return;

    // 클릭으로 파일 선택
    directFileUploadArea.addEventListener("click", () => {
      directFileInput.click();
    });

    // 드래그 앤 드롭 처리
    directFileUploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      directFileUploadArea.classList.add("drag-over");
    });

    directFileUploadArea.addEventListener("dragleave", () => {
      directFileUploadArea.classList.remove("drag-over");
    });

    directFileUploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      directFileUploadArea.classList.remove("drag-over");

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        directFileInput.files = files;
        this.handleDirectFileSelect({ target: { files: [files[0]] } });
      }
    });
  }

  setupServerFileUpload() {
    const serverFileUploadArea = document.getElementById(
      "serverFileUploadArea"
    );
    const serverFileInput = document.getElementById("serverFile");

    if (!serverFileUploadArea || !serverFileInput) return;

    // 클릭으로 파일 선택
    serverFileUploadArea.addEventListener("click", () => {
      serverFileInput.click();
    });

    // 드래그 앤 드롭 처리
    serverFileUploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      serverFileUploadArea.classList.add("drag-over");
    });

    serverFileUploadArea.addEventListener("dragleave", () => {
      serverFileUploadArea.classList.remove("drag-over");
    });

    serverFileUploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      serverFileUploadArea.classList.remove("drag-over");

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        serverFileInput.files = files;
        this.handleServerFileSelect({ target: { files: [files[0]] } });
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

    // skipToUpload 섹션 숨기기
    const skipToUpload = document.getElementById("skipToUpload");
    if (skipToUpload) {
      skipToUpload.classList.add("hidden");
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

    // 파일 정보를 저장하여 나중에 시간 예측에 사용
    this.fileListData = files;

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

    this.showProgress("recompressProgress", "압축 중...", true);

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
        this.hideProgress("recompressProgress");
        // 압축된 파일 크기 저장 (업로드 시간 예측용)
        this.compressedFileSize = data.size;
      } else {
        this.showError(data.error || "압축 중 오류가 발생했습니다.");
        this.hideProgress("recompressProgress");
      }
    } catch (error) {
      console.error("압축 오류:", error);
      this.showError("서버와 통신 중 오류가 발생했습니다.");
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

  showProgress(progressId, message, useSpinner = false) {
    const progressContainer = document.getElementById(progressId);
    const progressText = progressContainer.querySelector(".progress-text");
    const progressBar = progressContainer.querySelector(".progress-bar");

    progressText.textContent = message;
    progressContainer.classList.remove("hidden");

    if (useSpinner) {
      // 프로그래스바 숨기고 로딩 스피너로 변경
      progressBar.style.display = "none";

      // 로딩 스피너 추가
      if (!progressContainer.querySelector(".loading-spinner")) {
        const spinner = document.createElement("div");
        spinner.className = "loading-spinner";
        progressContainer.insertBefore(spinner, progressText);
      }
    } else {
      // 프로그래스바 사용
      progressBar.style.display = "block";

      // 스피너 제거
      const spinner = progressContainer.querySelector(".loading-spinner");
      if (spinner) {
        spinner.remove();
      }
    }
  }

  hideProgress(progressId) {
    const progressContainer = document.getElementById(progressId);
    progressContainer.classList.add("hidden");

    // 프로그래스바 다시 표시
    const progressBar = progressContainer.querySelector(".progress-bar");
    if (progressBar) {
      progressBar.style.display = "block";
    }

    // 로딩 스피너 제거
    const spinner = progressContainer.querySelector(".loading-spinner");
    if (spinner) {
      spinner.remove();
    }

    // 진행률 리셋
    const progressFill = progressContainer.querySelector(".progress-fill");
    if (progressFill) {
      progressFill.style.width = "0%";
      progressFill.style.animation = "none";
    }
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

  // 압축 시간 예측 (파일 크기 기반)
  estimateCompressionTime(files) {
    if (!files || files.length === 0) {
      return 1500; // 기본값
    }

    // 총 파일 크기 계산
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);

    // MB 단위로 변환
    const sizeInMB = totalSize / (1024 * 1024);

    // 압축 시간 계산 (대략적인 공식)
    // 1MB당 약 200ms, 최소 1초, 최대 10초
    const estimatedTime = Math.max(1000, Math.min(10000, sizeInMB * 200));

    console.log(
      `압축 시간 예측: ${sizeInMB.toFixed(2)}MB -> ${estimatedTime}ms`
    );
    return estimatedTime;
  }

  // 업로드 시간 예측 (파일 크기 기반)
  estimateUploadTime(fileSize) {
    if (!fileSize) {
      return 2000; // 기본값
    }

    // MB 단위로 변환
    const sizeInMB = fileSize / (1024 * 1024);

    // 업로드 시간 계산 (네트워크 속도 가정: 1MB/s)
    // 1MB당 약 1000ms, 최소 1초, 최대 30초
    const estimatedTime = Math.max(1000, Math.min(30000, sizeInMB * 1000));

    console.log(
      `업로드 시간 예측: ${sizeInMB.toFixed(2)}MB -> ${estimatedTime}ms`
    );
    return estimatedTime;
  }

  // 진행률 시뮬레이션
  simulateProgress(progressId, baseMessage, duration) {
    const progressContainer = document.getElementById(progressId);
    const progressFill = progressContainer.querySelector(".progress-fill");
    const progressText = progressContainer.querySelector(".progress-text");

    let progress = 0;
    const increment = 100 / (duration / 50); // 50ms 간격으로 업데이트

    const interval = setInterval(() => {
      progress += increment;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }

      progressFill.style.width = `${progress}%`;
      progressText.textContent = `${baseMessage}... ${Math.round(progress)}%`;
    }, 50);
  }

  // 실제 작업 진행률 폴링
  async pollOperationProgress(sessionId, progressId, onComplete) {
    // 기존 폴링이 있다면 중단
    if (this.activePollings && this.activePollings[sessionId]) {
      clearInterval(this.activePollings[sessionId]);
    }

    if (!this.activePollings) {
      this.activePollings = {};
    }

    if (!this.completionCallbacks) {
      this.completionCallbacks = {};
    }

    // 완료 콜백 저장
    if (onComplete) {
      this.completionCallbacks[sessionId] = onComplete;
    }

    this.activePollings[sessionId] = setInterval(async () => {
      try {
        const response = await fetch(`/api/progress/${sessionId}`);
        if (response.ok) {
          const progressData = await response.json();

          // 진행률 업데이트
          const progressContainer = document.getElementById(progressId);
          const progressFill =
            progressContainer.querySelector(".progress-fill");
          const progressText =
            progressContainer.querySelector(".progress-text");

          if (progressFill && progressText) {
            progressFill.style.width = `${progressData.progress}%`;
            progressText.textContent =
              progressData.message || `처리 중... ${progressData.progress}%`;
          }

          // 완료 또는 오류 시 폴링 중단
          if (progressData.phase === "completed") {
            clearInterval(this.activePollings[sessionId]);
            delete this.activePollings[sessionId];

            const callback = this.completionCallbacks[sessionId];
            if (callback) {
              setTimeout(callback, 500); // 잠깐 대기 후 완료 처리
              delete this.completionCallbacks[sessionId];
            }
          } else if (progressData.phase === "error") {
            clearInterval(this.activePollings[sessionId]);
            delete this.activePollings[sessionId];
            delete this.completionCallbacks[sessionId];

            this.showError(
              progressData.message || "작업 중 오류가 발생했습니다."
            );
            this.hideProgress(progressId);
          }
        } else {
          clearInterval(this.activePollings[sessionId]);
          delete this.activePollings[sessionId];
        }
      } catch (error) {
        console.error("진행률 확인 오류:", error);
        clearInterval(this.activePollings[sessionId]);
        delete this.activePollings[sessionId];
      }
    }, 500); // 0.5초마다 확인

    // 30초 후 타임아웃
    setTimeout(() => {
      if (this.activePollings[sessionId]) {
        clearInterval(this.activePollings[sessionId]);
        delete this.activePollings[sessionId];
        delete this.completionCallbacks[sessionId];
      }
    }, 30000);
  }

  // 작업 완료 콜백 설정
  setOperationCompleteCallback(sessionId, callback) {
    if (!this.completionCallbacks) {
      this.completionCallbacks = {};
    }
    this.completionCallbacks[sessionId] = callback;
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
      .getElementById("compressedRemoteFilename")
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
      this.showProgress("uploadProgress", "FTP 서버에 업로드 중...", true);

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
      this.hideProgress("uploadProgress");
    } catch (error) {
      console.error("서버 업로드 오류:", error);
      this.showError(`서버와 통신 중 오류가 발생했습니다: ${error.message}`);
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
      const compressedRemoteFilenameInput = document.getElementById(
        "compressedRemoteFilename"
      );
      const serverRemoteFilenameInput = document.getElementById(
        "serverRemoteFilename"
      );

      if (compressedRemoteFilenameInput) {
        compressedRemoteFilenameInput.value = outputFilename;
      }
      if (serverRemoteFilenameInput) {
        serverRemoteFilenameInput.value = outputFilename;
      }
    }
  }

  // 압축 건너뛰기: 서버 파일 조회
  skipToServerBrowse() {
    // 임시 세션 ID 생성 (서버 조회용)
    this.sessionId = "browse-" + Date.now();
    this.currentStep = 5;
    this.showStep(5);
    // 재압축된 파일 업로드 섹션 숨기기
    document.querySelector('.compressed-file-upload-section').classList.add('hidden');
    // 서버 파일 업로드 섹션 보이기
    document.querySelector('.server-upload-section').classList.remove('hidden');
    // 서버 폴더 조회 실행
    setTimeout(() => {
      this.browseServerFolder();
    }, 100);
  }

  // 압축 건너뛰기: 직접 업로드
  skipToDirectUpload() {
    this.showSection("directUpload");
  }

  // 직접 파일 선택 처리
  handleDirectFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      const filename = file.name;
      document.getElementById("directRemoteFilename").value = filename;
    }
  }

  // 직접 업로드 실행
  async directUpload() {
    const fileInput = document.getElementById("directFile");
    const remoteFilename = document
      .getElementById("directRemoteFilename")
      .value.trim();

    if (!fileInput.files[0]) {
      alert("업로드할 파일을 선택해주세요.");
      return;
    }

    if (!remoteFilename) {
      alert("서버 파일명을 입력해주세요.");
      return;
    }

    try {
      // 임시 세션 생성
      const tempSessionId = "direct-" + Date.now();

      // 파일을 멀티파트로 서버에 업로드
      const formData = new FormData();
      formData.append("sessionId", tempSessionId);
      formData.append("filename", remoteFilename);
      formData.append("targetFolder", ""); // 루트 폴더
      formData.append("uploadFile", fileInput.files[0]);

      this.showProgress("directUploadProgress", "파일 업로드 중...", true);

      // 먼저 파일을 서버에 임시 저장
      const addResponse = await fetch("/api/add-file", {
        method: "POST",
        body: formData,
      });

      if (!addResponse.ok) {
        throw new Error("파일 업로드 실패");
      }

      // 재압축 (실제로는 복사)
      const recompressResponse = await fetch("/api/recompress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: tempSessionId,
          filename: remoteFilename,
        }),
      });

      if (!recompressResponse.ok) {
        throw new Error("파일 처리 실패");
      }

      // SFTP 서버로 업로드
      const uploadResponse = await fetch("/api/upload-to-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: tempSessionId,
          remoteFilename: remoteFilename,
        }),
      });

      const uploadResult = await uploadResponse.json();

      this.hideProgress("directUploadProgress");

      if (uploadResult.success) {
        this.showDirectUploadResult(uploadResult);
      } else {
        throw new Error(uploadResult.error || "SFTP 업로드 실패");
      }
    } catch (error) {
      this.hideProgress("directUploadProgress");
      console.error("직접 업로드 오류:", error);
      alert(`업로드 실패: ${error.message}`);
    }
  }

  // 직접 업로드 결과 표시
  showDirectUploadResult(result) {
    const resultDiv = document.getElementById("directUploadResult");
    const messageP = document.getElementById("directUploadMessage");
    const downloadLink = document.getElementById("directDownloadLink");

    messageP.textContent =
      result.message || "파일이 성공적으로 업로드되었습니다.";

    if (result.downloadUrl) {
      downloadLink.href = result.downloadUrl;
      downloadLink.style.display = "inline-block";
    } else {
      downloadLink.style.display = "none";
    }

    resultDiv.classList.remove("hidden");
  }

  // 메인으로 돌아가기
  backToMain() {
    this.showStep(1);
    this.resetDirectUpload();
  }

  // 직접 업로드 폼 리셋
  resetDirectUpload() {
    document.getElementById("directFile").value = "";
    document.getElementById("directRemoteFilename").value = "";
    document.getElementById("directUploadResult").classList.add("hidden");
  }

  // 서버 파일 선택 처리
  handleServerFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      const filename = file.name;
      document.getElementById("serverRemoteFilename").value = filename;
    }
  }

  // 서버 파일 업로드
  async serverFileUpload() {
    const fileInput = document.getElementById("serverFile");
    const remoteFilename = document
      .getElementById("serverRemoteFilename")
      .value.trim();

    if (!fileInput.files[0]) {
      alert("업로드할 파일을 선택해주세요.");
      return;
    }

    if (!remoteFilename) {
      alert("서버 파일명을 입력해주세요.");
      return;
    }

    try {
      // 먼저 서버에서 파일 존재 여부 확인
      const checkResponse = await fetch("/api/check-direct-server-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename: remoteFilename }),
      });

      if (checkResponse.ok) {
        const checkResult = await checkResponse.json();
        if (checkResult.exists) {
          const overwrite = confirm(
            `서버에 '${remoteFilename}' 파일이 이미 존재합니다.\n덮어쓰시겠습니까?`
          );
          if (!overwrite) {
            return;
          }
        }
      }

      // 파일을 직접 SFTP 서버에 업로드
      const formData = new FormData();
      formData.append("filename", remoteFilename);
      formData.append("uploadFile", fileInput.files[0]);

      this.showProgress("uploadProgress", "파일 업로드 중...", true);

      // 직접 SFTP 서버로 업로드
      const uploadResponse = await fetch("/api/direct-upload-to-server", {
        method: "POST",
        body: formData,
      });

      console.log(
        "응답 상태:",
        uploadResponse.status,
        uploadResponse.statusText
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("HTTP 오류:", uploadResponse.status, errorText);
        throw new Error(`HTTP ${uploadResponse.status}: ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();

      this.hideProgress("uploadProgress");

      console.log("서버 응답:", uploadResult);

      if (uploadResult.success) {
        this.showUploadResult(uploadResult);
        // 파일 목록 새로고침
        setTimeout(() => {
          this.browseServerFolder();
        }, 1000);
        // 폼 리셋
        document.getElementById("serverFile").value = "";
        document.getElementById("serverRemoteFilename").value = "";
      } else {
        console.error("서버 응답 오류:", uploadResult);
        throw new Error(
          `${uploadResult.error}${
            uploadResult.details ? ": " + uploadResult.details : ""
          }`
        );
      }
    } catch (error) {
      this.hideProgress("uploadProgress");
      console.error("서버 파일 업로드 오류:", error);

      // 더 자세한 오류 정보 표시
      let errorMessage = error.message;
      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage = `${errorData.error}${
            errorData.details ? ": " + errorData.details : ""
          }`;
        } catch (e) {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      }

      alert(`업로드 실패: ${errorMessage}`);
    }
  }

  // 섹션 표시 (기존 showStep과 유사하지만 더 유연)
  showSection(sectionId) {
    // 모든 섹션 숨기기
    document.querySelectorAll(".step").forEach((step) => {
      step.classList.add("hidden");
    });

    // 지정된 섹션 표시
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove("hidden");
    }
  }
}

// 애플리케이션 초기화
document.addEventListener("DOMContentLoaded", () => {
  new ZipPdfManager();
});
