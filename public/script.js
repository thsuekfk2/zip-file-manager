class ZipPdfManager {
  constructor() {
    this.sessionId = null;
    this.currentStep = 1;
    this.selectedFile = null;
    this.directFiles = null;
    this.serverFiles = null;
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
      this.directFiles = e.target.files;
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
      this.backToMainFromServer();
      // 1단계로 돌아갈 때 다운로드 컨트롤 다시 보이기
      this.showDownloadControls();
    });

    document.getElementById("backToStep2").addEventListener("click", () => {
      this.showStep(2);
    });

    document
      .getElementById("backToStep2FromStep4")
      .addEventListener("click", () => {
        this.showStep(2);
      });

    document.getElementById("backToStep4").addEventListener("click", () => {
      this.backToMainFromServer();
    });

    // 재압축된 파일 업로드 관련
    document
      .getElementById("compressedUploadBtn")
      .addEventListener("click", () => {
        this.uploadToServer();
      });

    // 서버 파일 업로드 관련
    document.getElementById("serverFile").addEventListener("change", (e) => {
      this.serverFiles = e.target.files;
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
        document
          .querySelector(".compressed-file-upload-section")
          .classList.remove("hidden");
        // 서버 파일 업로드 섹션 숨기기
        document
          .querySelector(".server-upload-section")
          .classList.add("hidden");
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
        this.directFiles = files;
        this.handleDirectFileSelect({ target: { files: files } });
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
        this.serverFiles = files;
        this.handleServerFileSelect({ target: { files: files } });
      }
    });
  }

  handleFileSelect(file) {
    // 파일 크기 제한 제거 (모든 크기 허용)

    this.selectedFile = file;
    this.updateFileDisplay(file);
    this.updateFileUploadDisplay("fileUploadArea", [file]);

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

    // 다운로드 버튼 숨기기
    const downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn) {
      downloadBtn.classList.add("hidden");
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
        this.hideProgress("downloadProgress");
        // 에러 시 다운로드 버튼과 skipToUpload 섹션 다시 보이기
        this.showDownloadControls();
      }
    } catch (error) {
      console.error("다운로드 오류:", error);
      this.showError("서버와 통신 중 오류가 발생했습니다.");
      this.hideProgress("downloadProgress");
      // 에러 시 다운로드 버튼과 skipToUpload 섹션 다시 보이기
      this.showDownloadControls();
    }
  }

  // 다운로드 컨트롤 다시 보이기
  showDownloadControls() {
    const downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn) {
      downloadBtn.classList.remove("hidden");
    }

    const skipToUpload = document.getElementById("skipToUpload");
    if (skipToUpload) {
      skipToUpload.classList.remove("hidden");
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
            // 2단계에서 멈춰서 사용자가 선택할 수 있도록 함
            this.showStep(2);
            this.hideProgress("downloadProgress");
          } else if (progressData.phase === "error") {
            clearInterval(checkInterval);
            this.showError(
              progressData.error || "다운로드 중 오류가 발생했습니다."
            );
            this.hideProgress("downloadProgress");
            // 에러 시 다운로드 버튼과 skipToUpload 섹션 다시 보이기
            this.showDownloadControls();
          }
        }
      } catch (error) {
        console.error("완료 확인 오류:", error);
        clearInterval(checkInterval);
        this.hideProgress("downloadProgress");
        // 에러 시 다운로드 버튼과 skipToUpload 섹션 다시 보이기
        this.showDownloadControls();
      }
    }, 1000); // 1초마다 확인

    // 5분 후 타임아웃
    setTimeout(() => {
      clearInterval(checkInterval);
      this.showError("다운로드 시간이 초과되었습니다.");
      this.hideProgress("downloadProgress");
      // 타임아웃 시 다운로드 버튼과 skipToUpload 섹션 다시 보이기
      this.showDownloadControls();
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
                        <button class="delete-btn" onclick="zipManager.deleteLocalFile('${file.name}')" title="파일 삭제">×</button>
                    </div>
                </div>
            `;
      })
      .join("");

    fileList.innerHTML = `
            <div class="file-list-header">
              <h3>총 ${files.length}개의 파일</h3>
              <button class="add-file-btn" onclick="zipManager.openQuickFileSelector()" title="파일 추가">+</button>
            </div>
            ${fileItems}
            <input type="file" id="quickFileInput" style="display: none;" onchange="zipManager.handleQuickFileAdd(event)">
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
    const addBtn = document.getElementById("addFileBtn");

    // 이미 업로드 중인지 확인
    if (addBtn.disabled) {
      return;
    }

    const filename = document.getElementById("filename").value.trim();
    const targetFolder = document.getElementById("targetFolder").value;

    if (!filename || !this.selectedFile || targetFolder === "") {
      this.showError("파일명, 파일, 저장 폴더를 모두 선택해주세요.");
      return;
    }

    // 버튼 비활성화 및 텍스트 변경
    this.disableUploadButton(addBtn, "파일 추가 중...");

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
        // 파일 목록 업데이트 (기존 파일 목록 유지하면서 추가)
        this.displayFileList(data.files);
        if (data.folders) {
          this.populateFolderOptions(data.folders);
        }
        // 파일이 추가되었음을 명확히 표시
        this.showStep(4);
        this.showStatus("파일이 추가되었습니다. 이제 재압축할 수 있습니다.");
      } else {
        this.showError(data.error || "PDF 추가 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("PDF 추가 오류:", error);
      this.showError("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      // 버튼 활성화
      this.enableUploadButton(addBtn, "파일 추가");
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

    // 현재 단계가 2보다 큰 경우에만 이전 단계 상태 리셋 (파일 목록 유지)
    if (stepNumber > 2 && this.currentStep !== stepNumber) {
      this.resetStepState(this.currentStep);
    }

    // 현재 단계 표시
    const currentStep = document.getElementById(`step${stepNumber}`);
    if (currentStep) {
      currentStep.classList.add("active");
    }

    this.currentStep = stepNumber;

    // 단계별 진행 상황 표시
    this.updateStepProgress(stepNumber);
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

  // 파일 업로드 영역에 파일 목록 표시
  updateFileUploadDisplay(uploadAreaId, files) {
    const uploadArea = document.getElementById(uploadAreaId);
    if (!uploadArea || !files || files.length === 0) return;

    // FileList를 배열로 변환
    const fileArray = Array.from(files);

    uploadArea.classList.add("has-files");

    let fileListHtml = "";
    if (fileArray.length === 1) {
      const file = fileArray[0];
      const fileSize = this.formatFileSize(file.size);
      fileListHtml = `
        <div class="upload-placeholder">
          <div class="upload-icon">📁</div>
          <p><strong>${file.name}</strong></p>
          <p style="color: #666; font-size: 12px;">${fileSize}</p>
          <p style="color: #999; font-size: 11px; margin-top: 8px;">클릭하여 다른 파일 선택</p>
        </div>
      `;
    } else {
      const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
      const formattedTotalSize = this.formatFileSize(totalSize);

      const fileItems = fileArray
        .map((file) => {
          const fileSize = this.formatFileSize(file.size);
          return `
          <div class="uploaded-file-item">
            <span class="uploaded-file-name">${file.name}</span>
            <span class="uploaded-file-size">${fileSize}</span>
          </div>
        `;
        })
        .join("");

      fileListHtml = `
        <div class="uploaded-files-list">
          <h4>선택된 파일 (${fileArray.length}개) - 총 ${formattedTotalSize}</h4>
          ${fileItems}
          <p style="color: #999; font-size: 11px; margin-top: 12px; text-align: center;">클릭하여 다른 파일들 선택</p>
        </div>
      `;
    }

    uploadArea.innerHTML = fileListHtml;
  }

  // 파일 업로드 영역 초기화
  resetFileUploadDisplay(uploadAreaId) {
    const uploadArea = document.getElementById(uploadAreaId);
    if (!uploadArea) return;

    uploadArea.classList.remove("has-files");

    // 업로드 영역에 따른 텍스트 설정
    let uploadText = "파일을 드래그하여 놓거나";
    if (
      uploadAreaId === "directFileUploadArea" ||
      uploadAreaId === "serverFileUploadArea"
    ) {
      uploadText = "파일(들)을 드래그하여 놓거나";
    }

    // 원래의 업로드 영역 UI로 복원
    uploadArea.innerHTML = `
      <div class="upload-icon">+</div>
      <p>
        ${uploadText}
        <span class="upload-link">파일 선택</span>
      </p>
    `;
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

        // 파일인 경우에만 삭제 버튼 표시
        const deleteButton =
          file.type === "file"
            ? `<button class="delete-btn" onclick="zipManager.deleteServerFile('${file.name}')" title="파일 삭제">×</button>`
            : "";

        return `
          <div class="file-item">
            <div class="file-name ${
              file.type === "file" ? "clickable-filename" : ""
            }" 
                 ${
                   file.type === "file"
                     ? `onclick="zipManager.copyFileLink('${file.name}')" title="클릭하여 다운로드 링크 복사"`
                     : ""
                 }>
              ${fileType} ${file.name}
            </div>
            <div class="file-details">
              ${
                file.type === "file"
                  ? `<span class="file-size">${fileSize}</span>`
                  : ""
              }
              <span class="file-date">${fileDate}</span>
              ${deleteButton}
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
    const uploadBtn = document.getElementById("compressedUploadBtn");

    // 이미 업로드 중인지 확인
    if (uploadBtn.disabled) {
      return;
    }

    if (!this.sessionId) {
      this.showError("세션 정보가 없습니다.");
      return;
    }

    const remoteFilename = document
      .getElementById("compressedRemoteFilename")
      .value.trim();

    // 버튼 비활성화 및 텍스트 변경
    this.disableUploadButton(uploadBtn, "업로드 중...");

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
    } finally {
      // 버튼 활성화
      this.enableUploadButton(uploadBtn, "재압축된 파일 업로드");
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
    document
      .querySelector(".compressed-file-upload-section")
      .classList.add("hidden");
    // 서버 파일 업로드 섹션 보이기
    document.querySelector(".server-upload-section").classList.remove("hidden");
    // 서버 폴더 조회 실행
    setTimeout(() => {
      this.browseServerFolder();
    }, 100);
  }

  // 직접 파일 선택 처리
  handleDirectFileSelect(event) {
    if (!event.target) return;
    const files = event.target.files;
    if (files && files.length > 0) {
      this.updateFileUploadDisplay("directFileUploadArea", files);

      const directFilenameInput = document.getElementById(
        "directRemoteFilename"
      );
      if (directFilenameInput) {
        if (files.length === 1) {
          // 단일 파일인 경우 파일명 자동 설정
          directFilenameInput.value = files[0].name;
        } else {
          // 여러 파일인 경우 기본 ZIP 파일명 설정
          directFilenameInput.value = `archive_${Date.now()}.zip`;
        }
      }
    }
  }

  // 직접 업로드 실행
  async directUpload() {
    const uploadBtn = document.getElementById("directUploadBtn");

    // 이미 업로드 중인지 확인
    if (uploadBtn.disabled) {
      return;
    }

    const fileInput = document.getElementById("directFile");
    const remoteFilename = document
      .getElementById("directRemoteFilename")
      .value.trim();

    // 드래그 앤 드롭으로 선택된 파일이 있으면 그것을 사용, 없으면 input에서 가져오기
    const selectedFiles =
      this.directFiles || (fileInput ? fileInput.files : null);

    if (!selectedFiles || selectedFiles.length === 0) {
      alert("업로드할 파일을 선택해주세요.");
      return;
    }

    if (!remoteFilename) {
      alert("서버 파일명을 입력해주세요.");
      return;
    }

    // 버튼 비활성화 및 텍스트 변경
    this.disableUploadButton(uploadBtn, "업로드 중...");

    try {
      const files = Array.from(selectedFiles);

      // 파일이 2개 이상인 경우 ZIP 압축 확인
      if (files.length > 1) {
        const shouldCompress = confirm(
          `${files.length}개의 파일이 선택되었습니다.\nZIP 파일로 압축하여 업로드하시겠습니까?`
        );

        if (!shouldCompress) {
          return;
        }

        // 여러 파일을 ZIP으로 압축하여 업로드
        await this.uploadMultipleFilesAsZip(files, remoteFilename);
      } else {
        // 단일 파일 직접 업로드
        await this.uploadSingleFileDirect(files[0], remoteFilename);
      }
    } catch (error) {
      console.error("직접 업로드 오류:", error);
      this.hideProgress("directUploadProgress");
      this.showError("파일 업로드 중 오류가 발생했습니다: " + error.message);
    } finally {
      // 업로드 완료 후 버튼 활성화
      this.enableUploadButton(uploadBtn, "SFTP 서버에 업로드");
    }
  }

  // 단일 파일 직접 업로드
  async uploadSingleFileDirect(file, remoteFilename) {
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
    formData.append("uploadFile", file);

    this.showProgress("directUploadProgress", "파일 업로드 중...", true);

    // 직접 SFTP 서버로 업로드
    const uploadResponse = await fetch("/api/direct-upload-to-server", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`HTTP ${uploadResponse.status}: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    this.hideProgress("directUploadProgress");

    if (uploadResult.success) {
      this.showDirectUploadResult(uploadResult);
    } else {
      throw new Error(uploadResult.error || "업로드 실패");
    }
  }

  // 여러 파일을 ZIP으로 압축하여 업로드
  async uploadMultipleFilesAsZip(files, zipFilename) {
    this.showProgress("directUploadProgress", "세션 생성 중...", true);

    // 서버에서 임시 세션 생성
    const sessionResponse = await fetch("/api/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!sessionResponse.ok) {
      throw new Error("세션 생성 실패");
    }

    const sessionData = await sessionResponse.json();
    const tempSessionId = sessionData.sessionId;

    this.showProgress("directUploadProgress", "파일들을 처리 중...", true);

    // 각 파일을 서버에 임시 저장
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("sessionId", tempSessionId);
      formData.append("filename", file.name);
      formData.append("targetFolder", ""); // 루트 폴더
      formData.append("uploadFile", file);

      const addResponse = await fetch("/api/add-file", {
        method: "POST",
        body: formData,
      });

      if (!addResponse.ok) {
        throw new Error(`파일 ${file.name} 업로드 실패`);
      }
    }

    // ZIP 파일명 확장자 확인
    let finalZipName = zipFilename;
    if (!finalZipName.toLowerCase().endsWith(".zip")) {
      finalZipName += ".zip";
    }

    this.showProgress("directUploadProgress", "ZIP 파일로 압축 중...", true);

    // 재압축 (ZIP 생성)
    const recompressResponse = await fetch("/api/recompress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: tempSessionId,
        filename: finalZipName,
      }),
    });

    if (!recompressResponse.ok) {
      throw new Error("ZIP 압축 실패");
    }

    this.showProgress("directUploadProgress", "SFTP 서버에 업로드 중...", true);

    // SFTP 서버로 업로드
    const uploadResponse = await fetch("/api/upload-to-server", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: tempSessionId,
        remoteFilename: finalZipName,
      }),
    });

    const uploadResult = await uploadResponse.json();
    this.hideProgress("directUploadProgress");

    if (uploadResult.success) {
      this.showDirectUploadResult(uploadResult);
    } else {
      throw new Error(uploadResult.error || "SFTP 업로드 실패");
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
    this.resetDirectUploadState();
    this.showStep(1);
  }

  // 서버에서 메인으로 돌아가기 (skipToUpload 보이기)
  backToMainFromServer() {
    this.resetDirectUploadState();
    this.showStep(1);
    // skipToUpload 섹션 보이기
    document.getElementById("skipToUpload").classList.remove("hidden");
  }

  // 직접 업로드 상태 리셋
  resetDirectUploadState() {
    // 직접 업로드 진행률 숨기기
    this.hideProgress("directUploadProgress");

    // 직접 업로드 버튼 활성화
    const directUploadBtn = document.getElementById("directUploadBtn");
    this.enableUploadButton(directUploadBtn, "SFTP 서버에 업로드");

    // 직접 업로드 결과 숨기기
    const directUploadResult = document.getElementById("directUploadResult");
    if (directUploadResult) directUploadResult.classList.add("hidden");

    // 직접 업로드 폼 리셋
    this.resetDirectUpload();

    // 에러/상태 메시지 숨기기
    this.hideMessages();
  }

  // 직접 업로드 폼 리셋
  resetDirectUpload() {
    const directFileInput = document.getElementById("directFile");
    const directFilenameInput = document.getElementById("directRemoteFilename");
    const directUploadResult = document.getElementById("directUploadResult");

    if (directFileInput) directFileInput.value = "";
    if (directFilenameInput) directFilenameInput.value = "";
    if (directUploadResult) directUploadResult.classList.add("hidden");
    this.directFiles = null;
    this.resetFileUploadDisplay("directFileUploadArea");
  }

  // 서버 파일 선택 처리
  handleServerFileSelect(event) {
    if (!event.target) return;
    const files = event.target.files;
    if (files && files.length > 0) {
      this.updateFileUploadDisplay("serverFileUploadArea", files);

      const serverFilenameInput = document.getElementById(
        "serverRemoteFilename"
      );
      if (serverFilenameInput) {
        if (files.length === 1) {
          // 단일 파일인 경우 파일명 자동 설정
          serverFilenameInput.value = files[0].name;
        } else {
          // 여러 파일인 경우 기본 ZIP 파일명 설정
          serverFilenameInput.value = `archive_${Date.now()}.zip`;
        }
      }
    }
  }

  // 서버 파일 업로드
  async serverFileUpload() {
    const uploadBtn = document.getElementById("serverUploadBtn");

    // 이미 업로드 중인지 확인
    if (uploadBtn.disabled) {
      return;
    }

    const fileInput = document.getElementById("serverFile");
    const remoteFilename = document
      .getElementById("serverRemoteFilename")
      .value.trim();

    // 드래그 앤 드롭으로 선택된 파일이 있으면 그것을 사용, 없으면 input에서 가져오기
    const selectedFiles =
      this.serverFiles || (fileInput ? fileInput.files : null);

    if (!selectedFiles || selectedFiles.length === 0) {
      alert("업로드할 파일을 선택해주세요.");
      return;
    }

    if (!remoteFilename) {
      alert("서버 파일명을 입력해주세요.");
      return;
    }

    // 버튼 비활성화 및 텍스트 변경
    this.disableUploadButton(uploadBtn, "업로드 중...");

    try {
      const files = Array.from(selectedFiles);

      // 파일이 2개 이상인 경우 ZIP 압축 확인
      if (files.length > 1) {
        const shouldCompress = confirm(
          `${files.length}개의 파일이 선택되었습니다.\nZIP 파일로 압축하여 업로드하시겠습니까?`
        );

        if (!shouldCompress) {
          return;
        }

        // 여러 파일을 ZIP으로 압축하여 업로드
        await this.uploadServerMultipleFilesAsZip(files, remoteFilename);
      } else {
        // 단일 파일 직접 업로드
        await this.uploadServerSingleFileDirect(files[0], remoteFilename);
      }
    } catch (error) {
      console.error("서버 파일 업로드 오류:", error);
      this.hideProgress("uploadProgress");
      this.showError("파일 업로드 중 오류가 발생했습니다: " + error.message);
    } finally {
      // 버튼 활성화
      this.enableUploadButton(uploadBtn, "파일 업로드");
    }
  }

  // 서버 단일 파일 직접 업로드
  async uploadServerSingleFileDirect(file, remoteFilename) {
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
    formData.append("uploadFile", file);

    this.showProgress("uploadProgress", "파일 업로드 중...", true);

    // 직접 SFTP 서버로 업로드
    const uploadResponse = await fetch("/api/direct-upload-to-server", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`HTTP ${uploadResponse.status}: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    this.hideProgress("uploadProgress");

    if (uploadResult.success) {
      this.showUploadResult(uploadResult);
      // 파일 목록 새로고침
      setTimeout(() => {
        this.browseServerFolder();
      }, 1000);
      // 폼 리셋
      const serverFileInput = document.getElementById("serverFile");
      const serverFilenameInput = document.getElementById(
        "serverRemoteFilename"
      );

      if (serverFileInput) serverFileInput.value = "";
      if (serverFilenameInput) serverFilenameInput.value = "";
      this.serverFiles = null;
      this.resetFileUploadDisplay("serverFileUploadArea");
    } else {
      throw new Error(uploadResult.error || "업로드 실패");
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

  // 서버 여러 파일을 ZIP으로 압축하여 업로드
  async uploadServerMultipleFilesAsZip(files, zipFilename) {
    this.showProgress("uploadProgress", "세션 생성 중...", true);

    // 서버에서 임시 세션 생성
    const sessionResponse = await fetch("/api/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!sessionResponse.ok) {
      throw new Error("세션 생성 실패");
    }

    const sessionData = await sessionResponse.json();
    const tempSessionId = sessionData.sessionId;

    this.showProgress("uploadProgress", "파일들을 처리 중...", true);

    // 각 파일을 서버에 임시 저장
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("sessionId", tempSessionId);
      formData.append("filename", file.name);
      formData.append("targetFolder", ""); // 루트 폴더
      formData.append("uploadFile", file);

      const addResponse = await fetch("/api/add-file", {
        method: "POST",
        body: formData,
      });

      if (!addResponse.ok) {
        throw new Error(`파일 ${file.name} 업로드 실패`);
      }
    }

    // ZIP 파일명 확장자 확인
    let finalZipName = zipFilename;
    if (!finalZipName.toLowerCase().endsWith(".zip")) {
      finalZipName += ".zip";
    }

    this.showProgress("uploadProgress", "ZIP 파일로 압축 중...", true);

    // 재압축 (ZIP 생성)
    const recompressResponse = await fetch("/api/recompress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: tempSessionId,
        filename: finalZipName,
      }),
    });

    if (!recompressResponse.ok) {
      throw new Error("ZIP 압축 실패");
    }

    this.showProgress("uploadProgress", "SFTP 서버에 업로드 중...", true);

    // SFTP 서버로 업로드
    const uploadResponse = await fetch("/api/upload-to-server", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: tempSessionId,
        remoteFilename: finalZipName,
      }),
    });

    const uploadResult = await uploadResponse.json();
    this.hideProgress("uploadProgress");

    if (uploadResult.success) {
      this.showUploadResult(uploadResult);
      // 파일 목록 새로고침
      setTimeout(() => {
        this.browseServerFolder();
      }, 1000);
      // 폼 리셋
      const serverFileInput = document.getElementById("serverFile");
      const serverFilenameInput = document.getElementById(
        "serverRemoteFilename"
      );

      if (serverFileInput) serverFileInput.value = "";
      if (serverFilenameInput) serverFilenameInput.value = "";
      this.serverFiles = null;
      this.resetFileUploadDisplay("serverFileUploadArea");
    } else {
      throw new Error(uploadResult.error || "SFTP 업로드 실패");
    }
  }

  // 업로드 버튼 비활성화 헬퍼 함수
  disableUploadButton(button, loadingText) {
    if (button) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
      button.style.opacity = "0.6";
      button.style.cursor = "not-allowed";
    }
  }

  // 업로드 버튼 활성화 헬퍼 함수
  enableUploadButton(button, originalText) {
    if (button) {
      button.disabled = false;
      button.textContent =
        originalText || button.dataset.originalText || button.textContent;
      button.style.opacity = "1";
      button.style.cursor = "pointer";
      delete button.dataset.originalText;
    }
  }

  // 단계별 상태 리셋 함수
  resetStepState(fromStep) {
    if (!fromStep) return;

    switch (fromStep) {
      case 1:
        this.resetStep1State();
        break;
      case 2:
        this.resetStep2State();
        break;
      case 3:
        this.resetStep3State();
        break;
      case 4:
        this.resetStep4State();
        break;
      case 5:
        this.resetStep5State();
        break;
    }
  }

  // 1단계 상태 리셋
  resetStep1State() {
    // 다운로드 진행률 숨기기
    this.hideProgress("downloadProgress");
    // 다운로드 버튼 활성화
    const downloadBtn = document.getElementById("downloadBtn");
    this.enableUploadButton(downloadBtn, "다운로드");
    // 에러/상태 메시지 숨기기
    this.hideMessages();
  }

  // 2단계 상태 리셋 (파일 목록은 유지)
  resetStep2State() {
    // 파일 목록은 유지하고 메시지만 숨김
    this.hideMessages();
  }

  // 3단계 상태 리셋
  resetStep3State() {
    // 파일 추가 버튼 활성화
    const addBtn = document.getElementById("addFileBtn");
    this.enableUploadButton(addBtn, "파일 추가");

    // 파일 업로드 영역 리셋
    this.resetFileUploadArea();

    // 입력 필드 초기화
    document.getElementById("filename").value = "";
    document.getElementById("targetFolder").selectedIndex = 0;

    this.hideMessages();
  }

  // 4단계 상태 리셋
  resetStep4State() {
    // 재압축 진행률 숨기기
    this.hideProgress("recompressProgress");

    // 재압축 버튼 활성화
    const recompressBtn = document.getElementById("recompressBtn");
    this.enableUploadButton(recompressBtn, "재압축");

    // 다운로드 결과 숨기기
    const downloadResult = document.getElementById("downloadResult");
    if (downloadResult) downloadResult.classList.add("hidden");

    this.hideMessages();
  }

  // 5단계 상태 리셋
  resetStep5State() {
    // 업로드 진행률 숨기기
    this.hideProgress("uploadProgress");

    // 모든 업로드 버튼 활성화
    const compressedUploadBtn = document.getElementById("compressedUploadBtn");
    const serverUploadBtn = document.getElementById("serverUploadBtn");

    this.enableUploadButton(compressedUploadBtn, "재압축된 파일 업로드");
    this.enableUploadButton(serverUploadBtn, "파일 업로드");

    // 업로드 결과 숨기기
    const uploadResult = document.getElementById("uploadResult");
    if (uploadResult) uploadResult.classList.add("hidden");

    // 서버 파일 목록 숨기기
    const serverFileList = document.getElementById("serverFileList");
    if (serverFileList) serverFileList.classList.add("hidden");

    // 서버 파일 업로드 영역 리셋
    this.resetServerFileUploadArea();

    this.hideMessages();
  }

  // 파일 업로드 영역 리셋
  resetFileUploadArea() {
    const fileUploadArea = document.getElementById("fileUploadArea");
    const fileInput = document.getElementById("fileInput");

    if (fileInput) fileInput.value = "";
    this.selectedFile = null;

    if (fileUploadArea) {
      fileUploadArea.innerHTML = `
        <div class="upload-icon">+</div>
        <p>
          파일을 드래그하여 놓거나
          <span class="upload-link">파일 선택</span>
        </p>
        <input type="file" id="fileInput" hidden />
      `;
      // 이벤트 리스너 재설정
      this.setupFileUpload();
    }
  }

  // 서버 파일 업로드 영역 리셋
  resetServerFileUploadArea() {
    const serverFileInput = document.getElementById("serverFile");
    const serverRemoteFilename = document.getElementById(
      "serverRemoteFilename"
    );

    if (serverFileInput) serverFileInput.value = "";
    if (serverRemoteFilename) serverRemoteFilename.value = "";

    this.serverFiles = null;
    this.resetFileUploadDisplay("serverFileUploadArea");
  }

  // 에러/상태 메시지 숨기기
  hideMessages() {
    const statusMessage = document.getElementById("statusMessage");
    const errorMessage = document.getElementById("errorMessage");

    if (statusMessage) statusMessage.classList.add("hidden");
    if (errorMessage) errorMessage.classList.add("hidden");
  }

  // 로컬 파일 삭제 (압축 해제된 파일에서)
  async deleteLocalFile(filename) {
    if (!confirm(`'${filename}' 파일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      this.showStatus("파일 삭제 중...");

      const response = await fetch("/api/delete-local-file", {
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
        this.showStatus("파일이 삭제되었습니다.");
        this.displayFileList(data.files);
        if (data.folders) {
          this.populateFolderOptions(data.folders);
        }
      } else {
        this.showError(data.error || "파일 삭제에 실패했습니다.");
      }
    } catch (error) {
      this.showError("파일 삭제 중 오류가 발생했습니다.");
    }
  }

  // 서버 파일 삭제
  async deleteServerFile(filename) {
    // 삭제 확인
    const confirmDelete = confirm(
      `'${filename}' 파일을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      console.log("파일 삭제 요청:", filename);

      this.showStatus("파일 삭제 중...");

      const response = await fetch("/api/delete-server-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: filename,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        this.showStatus(result.message);

        // 파일 목록 새로고침
        setTimeout(() => {
          this.browseServerFolder();
        }, 500);
      } else {
        throw new Error(result.error || "파일 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("파일 삭제 오류:", error);
      this.showError(`파일 삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  // 파일 다운로드 링크 복사
  async copyFileLink(filename) {
    try {
      // 다운로드 링크 생성
      const downloadUrl = `https://download.acghr.co.kr/test/${filename}`;

      // 클립보드에 복사
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(downloadUrl);
      } else {
        // 폴백: 텍스트 영역을 사용한 복사
        const textArea = document.createElement("textarea");
        textArea.value = downloadUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      // 토스트 알림 표시
      this.showToast(`${filename} 링크가 복사되었습니다!`, "success");
    } catch (error) {
      console.error("링크 복사 오류:", error);
      this.showToast(`❌ 링크 복사에 실패했습니다: ${error.message}`, "error");
    }
  }

  // 토스트 알림 표시
  showToast(message, type = "success") {
    // 기존 토스트 제거
    const existingToast = document.querySelector(".toast");
    if (existingToast) {
      existingToast.remove();
    }

    // 새 토스트 생성
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // 애니메이션을 위해 약간 지연 후 show 클래스 추가
    setTimeout(() => {
      toast.classList.add("show");
    }, 100);

    // 3초 후 자동으로 제거
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300); // 애니메이션 시간
    }, 3000);
  }

  // 퀵 파일 선택창 열기
  openQuickFileSelector() {
    const quickFileInput = document.getElementById("quickFileInput");
    if (quickFileInput) {
      quickFileInput.click();
    }
  }

  // 퀵 파일 추가 처리
  async handleQuickFileAdd(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 사용 가능한 폴더 목록 확인
    const targetFolder = document.getElementById("targetFolder");
    if (!targetFolder || targetFolder.children.length <= 1) {
      this.showError(
        "폴더 정보를 찾을 수 없습니다. 파일 목록을 다시 로드해주세요."
      );
      return;
    }

    // 기본적으로 첫 번째 실제 폴더 선택 (루트가 아닌 첫 번째 폴더)
    let selectedFolder = "";
    for (let i = 1; i < targetFolder.children.length; i++) {
      const optionValue = targetFolder.children[i].value;
      if (optionValue !== "") {
        selectedFolder = optionValue;
        break;
      }
    }

    // 파일명 설정 (원본 파일명 사용)
    const filename = file.name;

    try {
      // 파일 존재 여부 확인
      const checkResponse = await fetch("/api/check-file-exists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          filename: filename,
          targetFolder: selectedFolder,
        }),
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.exists) {
          const confirmOverwrite = confirm(
            `"${filename}" 파일이 ${
              checkData.targetFolder || "선택한 폴더"
            }에 이미 존재합니다.\n\n기존 파일을 덮어씌우시겠습니까?`
          );
          if (!confirmOverwrite) {
            // 파일 입력 초기화
            event.target.value = "";
            return;
          }
        }
      }

      // 파일 추가 진행
      const formData = new FormData();
      formData.append("sessionId", this.sessionId);
      formData.append("filename", filename);
      formData.append("targetFolder", selectedFolder);
      formData.append("uploadFile", file);

      this.showStatus("파일을 추가하는 중...");

      const response = await fetch("/api/add-file", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        this.showStatus("파일이 성공적으로 추가되었습니다!");
        // 파일 목록 업데이트
        this.displayFileList(data.files);
        if (data.folders) {
          this.populateFolderOptions(data.folders);
        }
      } else {
        this.showError(data.error || "파일 추가 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("퀵 파일 추가 오류:", error);
      this.showError("파일 추가 중 오류가 발생했습니다: " + error.message);
    } finally {
      // 파일 입력 초기화
      event.target.value = "";
    }
  }

  // 2단계에서 재압축 (페이지 이동 없이)
  async recompressInPlace() {
    const outputFilename =
      document.getElementById("outputFilename")?.value.trim() ||
      "modified_archive.zip";

    const recompressBtn = document.getElementById("recompressInPlaceBtn");
    const originalText = recompressBtn.textContent;

    try {
      // 버튼 비활성화
      recompressBtn.disabled = true;
      recompressBtn.textContent = "압축 중...";

      this.showProgress("inPlaceRecompressProgress", "압축 중...", true);

      const response = await fetch("/api/recompress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          filename: outputFilename,
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.showInPlaceDownloadResult(data.filename, data.size);
        this.hideProgress("inPlaceRecompressProgress");
        this.showStatus("압축이 완료되었습니다!");
      } else {
        this.showError(data.error || "압축 중 오류가 발생했습니다.");
        this.hideProgress("inPlaceRecompressProgress");
      }
    } catch (error) {
      console.error("재압축 오류:", error);
      this.showError("서버와 통신 중 오류가 발생했습니다.");
      this.hideProgress("inPlaceRecompressProgress");
    } finally {
      // 버튼 활성화
      recompressBtn.disabled = false;
      recompressBtn.textContent = originalText;
    }
  }

  // 2단계 내에서 다운로드 결과 표시
  showInPlaceDownloadResult(filename, size) {
    const resultContainer = document.getElementById("inPlaceDownloadResult");
    const resultMessage = document.getElementById("inPlaceResultMessage");
    const finalDownloadBtn = document.getElementById("inPlaceFinalDownloadBtn");
    const uploadToServerBtn = document.getElementById(
      "inPlaceUploadToServerBtn"
    );

    finalDownloadBtn.setAttribute("data-filename", filename);

    const formattedSize = this.formatFileSize(size);
    resultMessage.textContent = `파일이 성공적으로 재압축되었습니다. (${formattedSize})`;

    // 이벤트 리스너 설정 (중복 방지)
    finalDownloadBtn.onclick = () => this.downloadFinalFile();
    uploadToServerBtn.onclick = () => this.uploadToServerFromInPlace();

    resultContainer.classList.remove("hidden");
  }

  // 2단계에서 서버 업로드로 이동
  uploadToServerFromInPlace() {
    this.setDefaultRemoteFilename();
    this.showStep(5);
    // 재압축된 파일 업로드 섹션 보이기
    document
      .querySelector(".compressed-file-upload-section")
      .classList.remove("hidden");
    // 서버 파일 업로드 섹션 숨기기
    document.querySelector(".server-upload-section").classList.add("hidden");
    // 페이지 진입 시 자동으로 서버 폴더 조회
    setTimeout(() => {
      this.browseServerFolder();
    }, 100);
  }

  // 단계별 진행상황 표시
  updateStepProgress(stepNumber) {
    const stepTitles = {
      1: "ZIP 파일 다운로드",
      2: "압축 해제된 파일 목록 확인",
      3: "파일 추가",
      4: "재압축 및 다운로드",
      5: "서버 업로드",
    };

    // 현재 단계 표시
    if (stepTitles[stepNumber]) {
      const statusMsg = `${stepTitles[stepNumber]} 진행 중...`;
      console.log(statusMsg);

      // 헤더에 현재 진행단계 표시 (선택사항)
      const stepHeader = document.querySelector(`#step${stepNumber} h2`);
      if (stepHeader && !stepHeader.dataset.originalText) {
        stepHeader.dataset.originalText = stepHeader.textContent;
        stepHeader.textContent = stepTitles[stepNumber];
      }
    }
  }
}

// 전역 변수 선언
let zipManager;

// 애플리케이션 초기화
document.addEventListener("DOMContentLoaded", () => {
  zipManager = new ZipPdfManager();
});
