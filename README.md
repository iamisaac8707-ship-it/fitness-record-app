# 체력측정 기록 관리 웹앱

학생 체력 측정값을 Supabase(Postgres/Auth/RLS)에 저장하고, 교사가 학급 기록과 통계를 확인하는 React + Vite 앱입니다.

## 주요 기능

- 교사 로그인/회원가입
- 학생 등록, 삭제, CSV 일괄등록
- 학생 간편코드 로그인
- 키/몸무게 기반 BMI 자동계산
- 악력, 10m 왕복달리기, 앉아윗몸앞으로굽히기, 제자리멀리뛰기 기록 저장
- 개인 추이 차트와 학급 기록 매트릭스
- 미측정자 표시, 학급 통계, CSV 내보내기

## 로컬 실행

```bash
npm install
cp .env.example .env
npm run dev
```

로컬 주소(`localhost`, `127.0.0.1`)는 개발자 컴퓨터에서만 접속됩니다. Supabase를 아직 연결하지 않으면 휘발성 데모 데이터로 화면을 확인할 수 있습니다.

## 학생 배포

- 학생들이 다른 기기에서 접속하려면 공개 호스팅이 필요합니다.
- 권장 구조는 Supabase DB + Render Static Site + 사용자 도메인입니다.
- 바로 따라 할 문서: `DEPLOY_PUBLIC_KO.md`
- DB 스키마: `supabase/schema.sql`
- 배포/도메인 안내: `docs/SETUP_KO.md`
- Render Blueprint: `render.yaml`
