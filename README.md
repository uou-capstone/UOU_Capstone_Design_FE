# AI Tutor LMS

AI 기반 학습 관리 시스템(LMS) 프론트엔드 애플리케이션입니다. 캡스톤 프로젝트의 일부로, 강의실·강의·자료·시험·평가를 관리하고 학생·선생님 역할에 따라 다른 화면과 기능을 제공합니다.

---

## 목차

- [주요 기능](#-주요-기능)
- [사용자 역할](#-사용자-역할)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [라우팅 및 페이지](#-라우팅-및-페이지)
- [API 연동](#-api-연동)
- [설치 및 실행](#-설치-및-실행)
- [환경 변수](#-환경-변수)
- [배포](#-배포)
- [기능 상세](#-기능-상세)
- [라이선스](#-라이선스)

---

## 주요 기능

- **인증**: 로그인, 회원가입, 비밀번호 찾기, JWT 기반 인증 및 자동 로그아웃(30분 무활동)
- **강의실·강의 관리**: 강의실 생성/수정/삭제, 강의(OT 포함) 생성, 강의실 ID 노출·복사, 초대 링크 복사
- **수강 신청**: 강의실 ID(숫자) 또는 초대 코드 입력으로 참여 (`POST /api/courses/{courseId}/enroll`, `POST /api/courses/join?code=`)
- **강의 자료**: PDF/PPT/DOC 등 업로드, AI 기획안 생성(키워드 기반), 자료 목록 표시
- **시험 생성**: 강의별 시험 생성(FLASH_CARD, OX_PROBLEM), 주제·문항 수 입력, AI 서비스 연동
- **평가**: 평가 생성·제출·상태 조회
- **AI 채팅**: 강의 자료 기반 질의응답, 오른쪽 사이드바 채팅 UI
- **UI/UX**: 3단 레이아웃(좌측 사이드바·메인·우측 채팅), 리사이저 드래그/더블클릭, 다크 모드, 반응형

---

## 사용자 역할

| 역할 | 설명 | 대표 기능 |
|------|------|-----------|
| **TEACHER** | 선생님 | 강의실·강의 생성, 강의실 ID/초대 링크 공유, 자료 업로드·AI 생성, 시험·평가 생성 |
| **STUDENT** | 학생 | 강의실 참여(ID/코드 입력), 자료 조회, 시험·평가 참여, AI 채팅 |

역할은 회원가입 시 선택하며, `AuthContext`·API 응답의 `User.role`로 구분합니다.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | React 19.1.1 |
| 언어 | TypeScript 5.6.0 |
| 빌드 | Vite 7.1.2 |
| 스타일 | Tailwind CSS 4.1.13 |
| 라우팅 | React Router DOM 7.9.1 |
| 기타 | react-markdown, remark-gfm (마크다운 렌더링) |

---

## 프로젝트 구조

```
capstone/
├── public/
├── src/
│   ├── components/
│   │   ├── common/           # 공통 컴포넌트
│   │   │   ├── TruckLoader.tsx
│   │   │   └── TruckLoader.css
│   │   ├── layout/           # 레이아웃
│   │   │   ├── AppLayout.tsx      # 메인 레이아웃, 라우트·사이드바·메인 영역 구성
│   │   │   ├── LeftSidebar.tsx    # 강의실 목록, 강의 목록, 프로필 드롭다운
│   │   │   ├── MainContent.tsx    # 강의실 목록/상세, 자료·시험·평가, 모달들
│   │   │   ├── RightSidebar.tsx   # 채팅·메시지 영역
│   │   │   └── TopNav.tsx        # 상단 네비게이션, 테마 토글
│   │   └── pages/            # 설정/도움말 등 페이지형 컴포넌트
│   │       ├── HelpPage.tsx
│   │       └── SettingsPage.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx   # 로그인 상태, getMe, 자동 로그아웃
│   │   └── ThemeContext.tsx # 다크/라이트 테마
│   ├── hooks/
│   │   └── useCourses.ts    # 강의실 목록/상세, 생성/수정/삭제/수강신청
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   └── JoinPage.tsx     # 수강 신청(강의실 ID 또는 초대 코드)
│   ├── services/
│   │   └── api.ts           # 모든 API 클라이언트 및 타입
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── netlify.toml
└── README.md
```

---

## 라우팅 및 페이지

| 경로 | 페이지 | 비고 |
|------|--------|------|
| `/login` | LoginPage | 로그인 (인증 필요 시 리다이렉트) |
| `/signup` | SignupPage | 회원가입 (역할 선택) |
| `/forgot-password` | ForgotPasswordPage | 비밀번호 찾기 |
| `/join` | JoinPage | 수강 신청 (강의실 ID 또는 초대 코드), `?code=` 쿼리 지원 |
| `/` | AppLayout | 강의실 목록 등 메인 (인증 필요) |
| `/courses/:courseId` | AppLayout | 특정 강의실 상세 (인증 필요) |
| 그 외 | `/` 로 리다이렉트 | SPA 폴백 |

---

## API 연동

백엔드 기본 URL: `https://uouaitutor.duckdns.org` (환경 변수로 변경 가능)

### 모듈별 엔드포인트 요약

| 모듈 | 용도 |
|------|------|
| **authApi** | 로그인, 회원가입, 로그아웃, getMe, 토큰 갱신 |
| **userApi** | 프로필 수정, 비밀번호 변경, 이메일 중복 확인, 계정 삭제 |
| **courseApi** | 강의실 CRUD, 상세 조회, 수강 신청(`/enroll`), 초대 코드 참여(`/join?code=`) |
| **lectureApi** | 강의 CRUD, 자료 업로드, 강의 상세 |
| **materialApi** | 자료 삭제 |
| **learningActivityApi** | 강의별 질의응답, 자가진단 퀴즈 |
| **assessmentApi** | 평가 목록/상세, 제출, 제출 상태 조회 |
| **lectureMaterialApi** | 강의 자료 생성(파일 업로드·에이전트) |
| **materialGenerationApi** | AI 자료 생성 Phase 1~5 |
| **streamingApi** | 강의 스트리밍 세션/초기화/next/answer/cancel |
| **examGenerationApi** | 시험 생성 — 메인 백엔드 `POST /api/exams/generation/async` (`lectureId`, `examType`, `targetCount`, `lectureContent` 등) |
| **monitoringApi** | 모니터링 개요, rate-limit, cache, agents |
| **checkServerStatus** | 서버 상태 확인 |

시험 생성(`examGenerationApi`)은 **항상 메인 백엔드**(`VITE_API_URL` 또는 개발 시 Vite 프록시의 `/api`)로만 요청합니다. `VITE_AI_SERVICE_URL`은 시험 생성에 사용되지 않습니다(코드에 예약된 `aiServiceRequest`와 별개).

에러 메시지에 `http://ai-service:8000/bridge/quiz` 같은 URL이 보이면, 그건 **브라우저가 직접 호출한 주소가 아니라** 메인 백엔드가 AI 쪽으로 호출하다 실패한 **내부 URL이 응답 본문에 포함된 것**입니다. 프론트에서 `bridge` 경로로 바꿀 설정은 없고, 메인 API 서버 쪽 연동 URL을 고치거나 `VITE_API_URL`을 올바른 메인 API 서버로 두면 됩니다.

---

## 설치 및 실행

### 요구사항

- Node.js v18 이상 권장
- npm 또는 yarn

### 설치

```bash
npm install
# 또는
yarn install
```

### 개발 서버

```bash
npm run dev
# 또는
yarn dev
```

기본 주소: `http://localhost:5173`

### 프로덕션 빌드

```bash
npm run build
# 또는
yarn build
```

산출물: `dist/`

### 빌드 미리보기

```bash
npm run preview
# 또는
yarn preview
```

### 린트

```bash
npm run lint
# 또는
yarn lint
```

---

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `VITE_API_URL` | 백엔드 API 기본 URL(시험 생성 포함 **모든** `apiRequest` 호출) | `https://uouaitutor.duckdns.org` |
| `VITE_AI_SERVICE_URL` | (현재 코드에서 시험 생성 미사용) `aiServiceRequest`용 예비 URL | `VITE_API_URL`과 동일 |

`.env` 예시:

```env
VITE_API_URL=https://uouaitutor.duckdns.org
# 시험 생성은 위 URL의 /api/exams/generation/async 만 사용합니다.
```

---

## 배포

### Netlify

- 저장소 연결 후 빌드 설정은 `netlify.toml` 참고.
- 빌드: `yarn build`, 퍼블리시: `dist`.
- `/api/*`는 백엔드로 프록시되도록 리다이렉트 설정 가능(현재 `netlify.toml`에 예시 포함).
- SPA 라우팅: `/*` → `/index.html`.

### 보안 헤더

- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` 등은 `netlify.toml`의 `[headers]`에서 설정.

---

## 기능 상세

### 리사이저

- 좌/우 사이드바와 메인 영역 경계를 드래그하여 폭 조정.
- 리사이저 더블클릭 시 기본 폭 복원 (좌 224px, 우 320px).
- 좌측 최소 150px·최대 40%, 우측 최소 200px·최대 60%.

### 강의실 참여(학생)

- **강의실 ID**: 숫자만 입력 시 `POST /api/courses/{courseId}/enroll` 호출 후 해당 강의실로 이동.
- **초대 코드**: 문자열 입력 시 `POST /api/courses/join?code=...` 호출 후 반환된 강의실로 이동.
- `/join` 페이지와 앱 내 “강의실 참여” 모달 모두 동일 규칙 적용.

### 선생님 전용

- 강의실 상세 헤더에 “강의실 ID: {숫자}” 표시 및 복사.
- “초대 링크 복사”로 `/join?code=...` 링크 복사.
- 강의실·강의 생성, 자료 업로드·AI 기획안 생성, 시험 생성, 평가 생성.

### 파일 업로드

- 지원 형식: PDF, PPT, PPTX, DOC, DOCX.
- 드래그 앤 드롭 또는 파일 선택 후 업로드.

### AI 채팅

- 강의 자료 기반 질의응답.
- 오른쪽 사이드바에서 메시지 입력 및 답변 표시(마크다운 지원).

---

## 라이선스

이 프로젝트는 캡스톤 프로젝트의 일부이며, 개인/교육용입니다.

---

## 기여

캡스톤 팀 내부 협업 프로젝트입니다.
