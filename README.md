# 🎮 POKETOWN FORUM (클라우드 16비트 도트 익명 소통 회의 웹앱)

> **사내 로컬 호스트나 사설 IP 없이, Vercel 무료 정식 배포 + Supabase Realtime Broadcast(WSS 443)로 작동하는 100% 서버리스 16비트 레트로 회의 플랫폼**

---

## 🌟 주요 특징

1. **100% 서버리스 & 클라우드 WSS 443 릴레이**
   - 백엔드 Node.js 서버(Express/ws 등) 없이 **100% 브라우저 클라이언트 코드**로 동작.
   - Supabase Realtime Broadcast(`supabase.channel('retro-town')`) 기능을 활용하여 별도 DB 테이블 생성 없이 브로드캐스팅.
   - 표준 HTTPS/WSS 443 포트로 통신하므로 사내 보안 방화벽, 유선망 vs 모바일 LTE 분리, 사설 IP 차단 정책을 완벽하게 우회.

2. **자동 배포 도메인 인식 QR 코드 (`DynamicQRCard`)**
   - `${window.location.origin}?role=pad` 주소를 실시간으로 인식하여 QR 코드로 생성.
   - Vercel의 `*.vercel.app` 도메인이나 커스텀 도메인에서도 설정 변경 없이 바로 동작.

3. **16비트 Canvas 2D 절차적 픽셀 아트 엔진**
   - 외부 이미지 에셋 링크가 깨질 염려 없는 순수 Canvas 2D 그래픽 (바다, 모래사장, 초원, 포켓몬 센터, 프렌들리숍, 부두, 나무).
   - 참가자 아바타 방향 전환 및 부드러운 이동(Lerp) 보간.
   - 발언 시 머리 위에 **5초간 팝업되는 픽셀 말풍선** 및 우측 실시간 퀘스트 & 익명 게시판.

4. **스마트폰 전용 레트로 컨트롤러 (`MobilePad`)**
   - `100dvh` 모바일 뷰포트 고정, `touch-action: none`, `user-select: none`.
   - 십자 D-Pad 터치패드 + A(말하기/포커스) / B(점프) 액션 버튼.
   - 빠른 반응 칩(`👏`, `💡`, `❓`, `🔥`, `❤️`).
   - 타이핑 중 D-Pad 간섭 방지 이벤트 분리.

---

## 🚀 Vercel 배포 방법 (클릭 몇 번으로 1분 배포)

### 방법 1. Vercel CLI 사용
```bash
npm i -g vercel
vercel
```

### 방법 2. GitHub 연동
1. 본 레포지토리를 GitHub에 Push합니다.
2. [Vercel 대시보드](https://vercel.com)에서 **Add New Project** 클릭 후 레포지토리 선택.
3. **Environment Variables**에 아래 2가지 환경변수 입력 (선택사항, 입력하지 않아도 UI에서 실시간 설정 가능):
   - `VITE_SUPABASE_URL`: Supabase Project URL (`https://xxxx.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon public key
4. **Deploy** 클릭! `vercel.json`의 SPA rewrite 설정이 자동 적용되어 정식 배포됩니다.

---

## 🔑 Supabase 무료 프로젝트 설정 안내 (1분 소요)

1. [Supabase](https://supabase.com)에 무료 가입 후 **New Project** 생성.
2. 좌측 메뉴 **Project Settings** -> **API**에서:
   - **Project URL**
   - **Project API Keys** -> `anon` `public` 키 복사.
3. `.env` 파일에 기입하거나 대형 스크린 화면의 **[Supabase 설정]** 팝업에서 직접 입력하여 즉시 동기화할 수 있습니다.

---

## 💻 로컬 개발 환경 실행

```bash
# 의존성 설치
npm install

# Vite 개발 서버 실행
npm run dev
```

- **대형 스크린 뷰**: `http://localhost:5173/` (또는 `?role=screen`)
- **스마트폰 패드 뷰**: `http://localhost:5173/?role=pad`
