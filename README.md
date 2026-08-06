# 안심海 (SeaSafe Busan)

부산 시민과 관광객을 위한 개인 맞춤형 해산물 섭취 의사결정 지원 웹앱입니다.

## 구현 기능

- 부산 7개 연안의 Leaflet·OpenStreetMap 위험지도
- Cloudflare Worker를 통한 해양자동관측망·식품안전나라·패류독소 원문 연결
- 해산물·지역·생식 여부·보관 상태·개인 조건을 반영하는 TypeScript 규칙 엔진
- 사진을 서버로 보내지 않는 보관 상태 교육용 시뮬레이터
- 공식 출처 링크가 있는 O/X 안전 퀴즈 12문제 중 5문제 무작위 출제
- HashRouter 기반 GitHub Pages 새로고침 대응, 모바일 하단 내비게이션

## 실행 및 검증

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

Worker도 별도 검증합니다.

```bash
cd worker
npm install
npm run typecheck
npm test
```

## 실시간 데이터 연결

API 키는 GitHub Pages에 넣지 않습니다. `worker/`를 Cloudflare Worker로 배포하고, `DATA_GO_KR_SERVICE_KEY`와 `FOOD_SAFETY_KOREA_API_KEY`를 Wrangler secret으로 등록합니다. 자세한 절차는 [실시간 데이터 연결 가이드](docs/realtime-data-setup.md)를 참고하세요.

프런트엔드에는 Worker 주소만 `.env.local`로 설정합니다.

```env
VITE_DATA_API_BASE_URL=https://<worker-name>.<account-subdomain>.workers.dev
```

연결 주소나 공식 응답이 없으면 앱은 임의의 현재 수치나 안전 상태를 만들지 않고 ‘최신 데이터 없음’ 또는 ‘판단할 정보 부족’으로 표시합니다.

## GitHub Pages 배포

`.github/workflows/deploy.yml`은 `main` 브랜치의 정적 결과물을 GitHub Pages에 배포하도록 구성되어 있습니다. Vite는 상대 `base`와 `HashRouter`를 사용해 프로젝트 하위 경로 새로고침 404를 피합니다. 실제 운영 빌드에서 Worker를 연결하려면 GitHub Actions의 `VITE_DATA_API_BASE_URL`에 공개 Worker 주소만 넣습니다.

## 공식 출처

- [공공데이터포털 해양자동관측망](https://www.data.go.kr/data/15127779/openapi.do)
- [국립수산과학원 패류독소 속보](https://www.nifs.go.kr/board/actionBoard0021List.do?selectPage=5)
- [부산광역시 해양수산 안전검사](https://www.busan.go.kr/depart/safetyinspection)
- [식품안전나라 API 안내](https://www.foodsafetykorea.go.kr/api/aboutApi.do)
- [식품안전나라 회수·판매중지 검색](https://www.foodsafetykorea.go.kr/portal/specialinfo/searchInfoProduct.do)
- [국립수산물품질관리원 패류독소 정보](https://www.fsis.go.kr/front/contents/cmsList.do?cate_id=0609)

## 안전 원칙과 제한사항

- 해양환경 관측값만으로 해산물의 안전을 보장하지 않습니다.
- 패류독소·회수·채취금지 정보는 가열로 무효화된다고 가정하지 않으며, 공식 원문을 확인해야 합니다.
- 보관 시뮬레이터의 시간별 위험 변화와 사진 효과는 교육용 규칙입니다. 사진만으로 병원균·패류독소·방사능 또는 실제 신선도를 판정하지 않습니다.
- 건강정보와 사진은 브라우저 안에서만 처리하며, 앱은 의료 진단이나 안전 보증 서비스가 아닙니다.
