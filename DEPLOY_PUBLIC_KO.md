# 학생들이 접속할 수 있게 공개 배포하기

`http://127.0.0.1:5173` 또는 `localhost`는 개발자 컴퓨터 전용 주소입니다. 학생들이 각자 휴대폰/태블릿/PC에서 접속하려면 아래처럼 **Supabase + Render + 도메인**으로 배포해야 합니다.

## 최종 구조

- 학생/교사 접속 주소: `https://app.your-domain.com`
- 화면 호스팅: Render Static Site
- DB/Auth: Supabase
- 학생 로그인: 교사가 나눠준 `login_code`

## 1. Supabase 프로젝트 만들기

1. Supabase에서 새 프로젝트 생성
2. `SQL Editor` 열기
3. 이 파일 전체 실행: `supabase/schema.sql`
4. `Project Settings > API`에서 아래 두 값을 복사
   - Project URL
   - anon 또는 publishable key

주의: `service_role` key는 절대 웹앱 환경변수에 넣지 마세요.

## 2. GitHub에 코드 올리기

Render는 GitHub 저장소를 기준으로 배포합니다.

```bash
cd fitness-record-app
git init
git add .
git commit -m "Build fitness measurement app"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
git push -u origin main
```

GitHub에서 빈 저장소를 먼저 만든 뒤 `YOUR_ACCOUNT/YOUR_REPO`만 바꾸면 됩니다.

## 3. Render에 공개 URL 만들기

1. Render 접속
2. `New > Blueprint`
3. GitHub 저장소 선택
4. `render.yaml`이 자동으로 Static Site 설정을 잡습니다.
5. 환경변수 입력
   - `VITE_SUPABASE_URL`: Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon/publishable key
6. 배포 완료 후 `https://fitness-record-app.onrender.com` 같은 공개 주소가 생깁니다.

## 4. 도메인 연결

Render 서비스의 `Settings > Custom Domains`에서 원하는 도메인을 추가합니다.

예: `app.example.com`

DNS 제공업체에서:

```text
Type: CNAME
Name: app
Value: <Render 서비스명>.onrender.com
```

루트 도메인 `example.com`을 바로 쓰고 싶으면 Render가 안내하는 `A`, `ALIAS`, `ANAME` 레코드를 사용하세요. 기존 `AAAA` IPv6 레코드가 있으면 제거합니다.

## 5. Supabase Auth URL 설정

교사 회원가입 이메일 확인을 사용할 경우 Supabase에서:

`Authentication > URL Configuration`

- Site URL: `https://app.example.com`
- Redirect URLs: `https://app.example.com/*`

## 6. 학생 배포 방법

학생들에게는 공개 주소와 로그인 코드만 주면 됩니다.

```text
접속 주소: https://app.example.com
학생용 선택
로그인 코드 입력
```

같은 교사용 화면에서 학생 코드 등록, CSV 등록, CSV 내보내기를 할 수 있습니다.
