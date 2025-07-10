# ZIP 파일 관리 및 FTP 업로드 도구

🚀 **Fastify 기반 웹 애플리케이션**

사내에서 사용할 목적으로 만들습니다.

URL에서 ZIP 파일을 다운로드하고, 압축을 해제한 후 사용자가 지정한 모든 형식의 파일을 추가하여 다시 압축하고, FTP 서버로 업로드할 수 있는 통합 웹 애플리케이션입니다.

## 주요 기능

### 1. ZIP 파일 다운로드 및 압축 해제

- URL에서 ZIP 파일 자동 다운로드
- 다운로드 진행률 표시
- 압축 해제된 파일 목록 표시

### 2. 파일 추가 (모든 형식 지원)

- 드래그 앤 드롭으로 파일 업로드
- **모든 파일 형식 지원** (PDF, 이미지, 문서, 응용프로그램 등)
- **파일 크기 제한 없음**
- 파일 존재 시 덮어쓰기 확인

### 3. 재압축 및 다운로드

- 모든 파일을 ZIP으로 재압축
- 사용자 정의 파일명 지원
- 압축 완료 후 다운로드 가능

### 4. FTP 서버 업로드

- **Windows FTP 서버 지원**
- 자동 서버 폴더 조회
- 서버 파일명 기본값 자동 설정
- 중복 파일 덮어쓰기 확인
- **업로드 완료 후 다운로드 링크 제공**

## 기술 스택

### 백엔드 (Server)

- **Fastify**: 고성능 웹 서버 프레임워크
- **@fastify/static**: 정적 파일 서빙
- **@fastify/multipart**: 파일 업로드 처리
- **@fastify/cors**: CORS 지원
- **axios**: HTTP 클라이언트 (ZIP 파일 다운로드)
- **yauzl**: ZIP 압축 해제
- **archiver**: ZIP 파일 생성
- **tmp**: 임시 파일 관리
- **fs-extra**: 파일 시스템 유틸리티
- **uuid**: 고유 세션 ID 생성
- **ftp**: FTP 클라이언트 (서버 업로드용)
- **dotenv**: 환경 변수 관리

### 프론트엔드 (Client)

- **Vanilla JavaScript**: 순수 자바스크립트
- **HTML5 APIs**: File API, Drag & Drop API
- **CSS3**: Grid/Flexbox, 애니메이션
- **Fetch API**: 비동기 HTTP 통신

## 프로젝트 구조

```
zip-program/
├── server.js                # Fastify 서버 + API 엔드포인트
├── package.json             # 의존성 관리
├── README.md               # 프로젝트 문서
├── .env                    # 환경 변수 (FTP 서버 정보)
├── .env.example            # 환경 변수 예제
├── .gitignore              # Git 무시 파일 목록
├── public/                 # 정적 파일
│   ├── index.html          # 메인 UI (5단계 워크플로우)
│   ├── style.css           # CSS 스타일
│   └── script.js           # JavaScript 클라이언트
└── uploads/                # 임시 파일 저장소 (자동 생성)
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정 (FTP 서버 사용 시)

`.env` 파일 예시:

```bash
# FTP 서버 연결 정보
FTP_HOST=your-ftp-server.com
FTP_PORT=21
FTP_USERNAME=your-username
FTP_PASSWORD=your-password
FTP_BASE_PATH=/path/to/upload/directory/

# 웹 접근 URL (다운로드 링크용)
WEB_ACCESS_URL=http://your-website.com/download

# 애플리케이션 설정
PORT=3000
```

### 3. 서버 실행

```bash
npm start
```

### 4. 브라우저 접속

```
http://localhost:3000
```

## 사용 방법

### 1단계: ZIP 파일 다운로드

1. ZIP 파일 URL 입력 (예: `https://example.com/file.zip`)
2. "다운로드 & 압축 해제" 버튼 클릭
3. 실시간 진행률 표시 및 완료 대기

### 2단계: 파일 목록 확인

- 압축 해제된 파일 목록 자동 표시
- 파일명, 크기, 수정일 정보 제공

### 3단계: 파일 추가

1. 파일명 입력 (확장자 포함)
2. 파일 드래그 앤 드롭 또는 클릭하여 선택
3. 저장할 폴더 선택
4. "파일 추가" 버튼 클릭
5. 중복 파일 시 덮어쓰기 확인

### 4단계: 재압축 및 다운로드

1. 출력 파일명 입력 (기본값: 원본 파일명)
2. "재압축" 버튼 클릭
3. 압축 완료 후 "다운로드" 또는 "FTP 서버에 업로드" 선택

### 5단계: FTP 서버 업로드 (선택사항)

1. **자동 서버 폴더 조회**: 페이지 진입 시 자동으로 FTP 서버 파일 목록 표시
2. **서버 파일명 설정**: 기본값 자동 입력, 필요 시 수정 가능
3. **중복 파일 확인**: 동일한 파일명 존재 시 덮어쓰기 확인 다이얼로그
4. **업로드 실행**: "서버에 업로드" 버튼 클릭
5. **다운로드 링크**: 업로드 완료 후 웹에서 접근 가능한 다운로드 링크 제공

## 🔧 API 엔드포인트

### 기본 엔드포인트

#### GET /

- 메인 페이지 서빙

#### POST /api/download-zip

- ZIP 파일 다운로드 및 압축 해제
- **Body**: `{ "url": "https://example.com/file.zip" }`

#### GET /api/download-progress/:sessionId

- 다운로드 진행률 조회 (실시간 폴링용)

### 파일 관리 엔드포인트

#### GET /api/files/:sessionId

- 압축 해제된 파일 목록 반환

#### POST /api/add-file

- 파일 추가 (multipart/form-data)
- **Fields**: `sessionId`, `filename`, `targetFolder`, `uploadFile`

#### POST /api/check-file-exists

- 파일 존재 여부 확인
- **Body**: `{ "sessionId": "uuid", "filename": "file.ext", "targetFolder": "folder" }`

#### POST /api/recompress

- 파일 재압축
- **Body**: `{ "sessionId": "uuid", "filename": "output.zip" }`

#### GET /api/download/:sessionId/:filename

- 압축된 파일 다운로드

### FTP 서버 엔드포인트 (신규)

#### GET /api/browse-server/:sessionId

- FTP 서버 폴더 조회

#### POST /api/check-server-file

- FTP 서버 파일 존재 확인
- **Body**: `{ "sessionId": "uuid", "filename": "file.zip" }`

#### POST /api/upload-to-server

- FTP 서버에 파일 업로드
- **Body**: `{ "sessionId": "uuid", "remoteFilename": "file.zip" }`
- **Response**: 업로드 결과 + 다운로드 링크
