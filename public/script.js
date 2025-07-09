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
      const response = await fetch("/api/download-zip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        this.sessionId = data.sessionId;
        this.showStatus(data.message);
        this.displayFileList(data.files);
        this.populateFolderOptions(data.folders);
        this.setDefaultOutputFilename(url);
        this.showStep(2);
        setTimeout(() => this.showStep(3), 1000);
      } else {
        this.showError(data.error || "다운로드 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("다운로드 오류:", error);
      this.showError("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      this.hideProgress("downloadProgress");
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
}

// 애플리케이션 초기화
document.addEventListener("DOMContentLoaded", () => {
  new ZipPdfManager();
});
