# ZIP 파일 관리 및 파일 추가 도구

🚀 **Fastify 기반 웹 애플리케이션**

URL에서 ZIP 파일을 다운로드하고, 압축을 해제한 후 사용자가 지정한 모든 형식의 파일을 추가하여 다시 압축하는 웹 애플리케이션입니다.

## ✨ 주요 기능

### 1. ZIP 파일 다운로드 및 압축 해제

- URL에서 ZIP 파일 자동 다운로드
- 실시간 진행률 표시
- 압축 해제된 파일 목록 표시

### 2. 파일 추가 (모든 형식 지원)

- 드래그 앤 드롭으로 파일 업로드
- **모든 파일 형식 지원** (PDF, 이미지, 문서, 응용프로그램 등)
- **파일 크기 제한 없음**
- 파일 존재 시 덮어쓰기 확인

### 3. 재압축 및 다운로드

- 모든 파일을 ZIP으로 재압축
- 사용자 정의 파일명 지원
- 압축 완료 후 즉시 다운로드

## 🛠️ 기술 스택

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

### 프론트엔드 (Client)

- **Vanilla JavaScript**: 순수 자바스크립트
- **HTML5 APIs**: File API, Drag & Drop API
- **CSS3**: Grid/Flexbox, 애니메이션
- **Fetch API**: 비동기 HTTP 통신

## 📁 프로젝트 구조

```
zip-program/
├── server.js                # Fastify 서버 + API 엔드포인트
├── package.json             # 의존성 관리
├── README.md               # 프로젝트 문서
├── public/                 # 정적 파일
│   ├── index.html          # 메인 UI
│   ├── style.css           # CSS 스타일
│   └── script.js           # JavaScript 클라이언트
└── uploads/                # 임시 파일 저장소 (자동 생성)
```

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 서버 실행

```bash
npm start
```

### 3. 브라우저 접속

```
http://localhost:3000
```

## 📖 사용 방법

### 1단계: ZIP 파일 다운로드

1. ZIP 파일 URL 입력 (예: `https://example.com/file.zip`)
2. "다운로드 & 압축 해제" 버튼 클릭
3. 진행률 표시 및 완료 대기

### 2단계: 파일 목록 확인

- 압축 해제된 파일 목록 자동 표시
- 파일명, 크기, 수정일 정보 제공

### 3단계: 파일 추가

1. 파일명 입력 (확장자 포함)
2. 파일 드래그 앤 드롭 또는 클릭하여 선택
3. 저장할 폴더 선택
4. "파일 추가" 버튼 클릭

### 4단계: 재압축 및 다운로드

1. 출력 파일명 입력 (기본값: 원본 파일명)
2. "재압축" 버튼 클릭
3. 압축 완료 후 "다운로드" 버튼으로 파일 다운로드

## 🔧 API 엔드포인트

### GET /

- 메인 페이지 서빙

### POST /api/download-zip

- ZIP 파일 다운로드 및 압축 해제
- **Body**: `{ "url": "https://example.com/file.zip" }`

### GET /api/files/:sessionId

- 압축 해제된 파일 목록 반환

### POST /api/add-file

- 파일 추가 (multipart/form-data)
- **Fields**: `sessionId`, `filename`, `targetFolder`, `uploadFile`

### POST /api/check-file-exists

- 파일 존재 여부 확인
- **Body**: `{ "sessionId": "uuid", "filename": "file.ext", "targetFolder": "folder" }`

### POST /api/recompress

- 파일 재압축
- **Body**: `{ "sessionId": "uuid", "filename": "output.zip" }`

### GET /api/download/:sessionId/:filename

- 압축된 파일 다운로드

## 🛡️ 보안 및 제한사항

### 파일 검증

- **모든 파일 형식 허용**
- **파일 크기 제한 없음**
- 파일 존재 시 덮어쓰기 확인

### 세션 관리

- UUID 기반 세션 식별
- 10분 후 자동 임시 파일 정리
- 메모리 누수 방지

### 에러 처리

- 네트워크 오류 처리
- 파일 시스템 오류 처리
- 사용자 친화적 에러 메시지

## 🎨 사용자 경험 (UX)

### 반응형 디자인

- 모바일 친화적 인터페이스
- 터치 기반 드래그 앤 드롭 지원

### 실시간 피드백

- 진행률 표시바
- 상태 메시지 및 알림
- 로딩 애니메이션

### 직관적 인터페이스

- 단계별 가이드
- 시각적 피드백
- 명확한 버튼 레이블

## 🔍 성능 최적화

### Fastify 최적화

- 내장 JSON 스키마 검증
- 빠른 라우팅 엔진
- 논블로킹 비동기 처리

### 파일 처리 최적화

- 스트리밍 파일 업로드/다운로드
- 메모리 효율적 압축/해제
- 임시 파일 자동 정리

### 클라이언트 최적화

- Vanilla JavaScript (프레임워크 없음)
- 효율적인 DOM 조작
- 이벤트 위임 패턴

## 📝 개발 고려사항

### 확장 가능성

- 모듈화된 코드 구조
- 플러그인 기반 아키텍처
- RESTful API 설계

### 유지보수성

- 명확한 함수 분리
- 에러 핸들링 표준화
- 코드 문서화

### 테스트 가능성

- 단위 테스트 가능한 구조
- API 엔드포인트 분리
- 의존성 주입 패턴

## 🚨 문제 해결

### 일반적인 문제

1. **ZIP 다운로드 실패**: URL 유효성 확인, 네트워크 연결 확인
2. **파일 업로드 실패**: 파일 형식 및 크기 확인
3. **압축 실패**: 디스크 공간 및 권한 확인

### 로그 확인

- 서버 콘솔에서 상세 에러 로그 확인
- 브라우저 개발자 도구에서 네트워크 요청 확인

## 📋 지원 파일 형식

### 모든 파일 형식 지원

- **문서**: PDF, DOC, DOCX, TXT, MD, etc.
- **이미지**: JPG, PNG, GIF, BMP, SVG, etc.
- **응용프로그램**: EXE, APP, DMG, etc.
- **압축파일**: ZIP, RAR, 7Z, etc.
- **기타**: 모든 파일 형식

## 📄 라이센스

MIT License

## 🤝 기여

이슈 및 풀 리퀘스트를 환영합니다!

---

**개발자**: Claude Code Assistant  
**최종 업데이트**: 2025-07-09  
**버전**: 2.0.0
