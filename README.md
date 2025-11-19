# AI Tutor LMS

AI 기반 학습 관리 시스템(LMS) 프론트엔드 애플리케이션입니다.

## 🚀 주요 기능

- **강의 자료 관리**: PDF, PPT, DOC 등 다양한 형식의 강의 자료 업로드 및 관리
- **AI 채팅**: 강의 자료에 대한 질문 및 AI 튜터와의 대화
- **반응형 레이아웃**: 사용자 친화적인 3단 레이아웃 (왼쪽 사이드바, 메인 컨텐츠, 오른쪽 채팅)
- **다크 모드**: 눈의 피로를 줄이는 다크 모드 지원
- **리사이저 기능**: 사이드바 폭을 드래그하여 조정 가능, 더블클릭으로 기본 크기 복원

## 🛠️ 기술 스택

- **프레임워크**: React 19.1.1
- **언어**: TypeScript 5.6.0
- **빌드 도구**: Vite 7.1.2
- **스타일링**: Tailwind CSS 4.1.13
- **라우팅**: React Router DOM 7.9.1

## 📦 설치 및 실행

### 필수 요구사항

- Node.js (v18 이상 권장)
- npm 또는 yarn

### 설치

```bash
npm install
# 또는
yarn install
```

### 개발 서버 실행

```bash
npm run dev
# 또는
yarn dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

### 프로덕션 빌드

```bash
npm run build
# 또는
yarn build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

### 빌드 미리보기

```bash
npm run preview
# 또는
yarn preview
```

## 📁 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   └── layout/        # 레이아웃 컴포넌트
│       ├── AppLayout.tsx      # 메인 레이아웃
│       ├── LeftSidebar.tsx    # 왼쪽 사이드바
│       ├── RightSidebar.tsx   # 오른쪽 채팅 사이드바
│       ├── MainContent.tsx    # 메인 컨텐츠 영역
│       └── TopNav.tsx         # 상단 네비게이션
├── contexts/           # React Context
│   └── ThemeContext.tsx       # 테마 관리
├── hooks/              # Custom Hooks
├── pages/              # 페이지 컴포넌트
├── services/           # API 서비스
│   └── api.ts          # API 통신 로직
└── types/              # TypeScript 타입 정의
```

## 🎨 주요 기능 설명

### 리사이저 기능

- **드래그로 크기 조정**: 사이드바와 메인 컨텐츠 사이의 리사이저 핸들을 드래그하여 폭 조정
- **더블클릭으로 리셋**: 리사이저 핸들을 더블클릭하면 기본 크기로 복원
  - 왼쪽 사이드바 기본 크기: 224px
  - 오른쪽 사이드바 기본 크기: 320px
- **제한 범위**:
  - 왼쪽 사이드바: 최소 150px, 최대 화면 너비의 40%
  - 오른쪽 사이드바: 최소 200px, 최대 화면 너비의 60%

### 파일 업로드

- 지원 형식: PDF, PPT, PPTX, DOC, DOCX
- 드래그 앤 드롭 또는 파일 선택 버튼으로 업로드
- 업로드된 파일은 메인 컨텐츠 영역에 표시

### AI 채팅

- 강의 자료에 대한 질문 및 답변
- 실시간 채팅 인터페이스
- 파일 첨부 기능

## 🔧 개발

### 코드 스타일

프로젝트는 ESLint를 사용하여 코드 스타일을 관리합니다.

```bash
npm run lint
# 또는
yarn lint
```

### 환경 변수

**개발 환경**: `http://3.36.233.169` (직접 연결)
**프로덕션 환경**: Netlify 프록시를 통한 상대 경로 (Mixed Content 문제 해결)

프로덕션 환경에서 다른 API URL을 사용하려면 `.env` 파일을 생성하고 다음을 추가하세요:

```env
VITE_API_URL=http://your-api-url.com
```

### 배포

#### Netlify 배포

1. Netlify에 프로젝트 연결
2. 빌드 설정은 `netlify.toml`에 정의되어 있음
3. `netlify.toml`이 자동으로 API 요청을 백엔드 서버(`http://3.36.233.169`)로 프록시

#### AWS EC2 백엔드 연결

- 백엔드 서버: `http://3.36.233.169`
- Netlify 프록시가 `/api/*` 요청을 백엔드로 전달
- Mixed Content 문제 없이 HTTPS에서 HTTP 백엔드 사용 가능

## 📝 라이선스

이 프로젝트는 개인 프로젝트입니다.

## 👥 기여

이 프로젝트는 캡스톤 프로젝트의 일부입니다.
