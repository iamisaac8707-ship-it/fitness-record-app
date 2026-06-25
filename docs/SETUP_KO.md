# 체력측정 기록 앱 배포 안내

## 1. 로컬 실행

```bash
cd fitness-record-app
npm install
cp .env.example .env
npm run dev
```

`.env`에는 Supabase 프로젝트의 URL과 anon/publishable key를 넣습니다.

## 2. Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. `SQL Editor`에서 `supabase/schema.sql` 전체를 실행합니다.
3. `Project Settings > API`에서 다음 값을 복사해 `.env`와 Render 환경변수에 넣습니다.
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. `Authentication > Providers`에서 Email provider가 켜져 있는지 확인합니다.
5. 이메일 확인을 켜서 운영할 경우 `Authentication > URL Configuration`의 Site URL을 배포 도메인으로 설정합니다.

주의: 브라우저 앱에는 `service_role` 또는 secret key를 절대 넣지 마세요. 이 앱은 학생 입력을 `login_code` 검증 RPC로 처리하고, 교사용 관리는 Supabase Auth + RLS로 제한합니다.

## 3. Render 배포

이 프로젝트에는 `render.yaml`이 들어 있습니다.

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Render에서 `New > Blueprint`로 저장소를 연결합니다.
3. 서비스 생성 중 환경변수 두 개를 입력합니다.
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 빌드 명령은 `npm ci && npm run build`, 정적 배포 경로는 `dist`입니다.
5. SPA 라우팅을 위해 `/* -> /index.html` rewrite가 이미 설정되어 있습니다.

## 4. 도메인 연결

Render 서비스가 만들어진 뒤 `Settings > Custom Domains`에서 사용할 도메인을 추가합니다.

- `app.example.com` 같은 서브도메인: DNS에 `CNAME app -> <서비스명>.onrender.com`
- `example.com` 루트 도메인: DNS 제공자가 지원하면 `ALIAS/ANAME @ -> <서비스명>.onrender.com`, 아니면 Render 대시보드가 안내하는 A 레코드 사용
- 기존 `AAAA` IPv6 레코드가 있으면 제거합니다.
- DNS 전파 후 Render에서 `Verify`를 누르면 TLS 인증서가 자동 발급됩니다.

Supabase Auth 이메일 확인 링크를 쓰는 경우, 같은 도메인을 Supabase의 Site URL에도 넣어야 합니다.

## 5. 운영 흐름

1. 교사가 계정을 만들고 로그인합니다.
2. 학생 관리에서 학생을 등록하거나 CSV로 가져옵니다.
3. 학생에게 `login_code`를 배포합니다.
4. 학생은 학생용 화면에서 코드로 들어가 측정값을 저장합니다.
5. 교사는 학급 기록, 미측정자, 통계, CSV 내보내기를 확인합니다.

CSV 일괄등록 형식:

```csv
학년,반,번호,이름,성별,로그인코드
1,3,21,하린,F,HRN2026
1,3,22,준서,M,JNS2026
```

로그인코드는 영문 대문자/숫자 6~12자로 운영하세요.
