# 안심海 실시간 데이터 연결

현재 GitHub Pages 화면은 공개 정적 프런트엔드이고, API 키를 브라우저에 넣지 않습니다. `worker/`의 Cloudflare Worker가 공공 API와 공식 페이지를 조회한 뒤 공통 응답 형태로 전달합니다.

## 1. 공공 API 준비

1. [공공데이터포털 해양자동관측망](https://www.data.go.kr/data/15127779/openapi.do)에서 활용신청 후 인증키와 실제 호출 URL을 확인합니다.
2. [식품안전나라 API 안내](https://www.foodsafetykorea.go.kr/api/aboutApi.do)에서 회원가입·활용신청 후 API 키를 발급받습니다. 회수·판매중지 서비스는 `I0490`을 사용합니다.
3. 패류독소 원문은 [국립수산과학원 패류독소 속보](https://www.nifs.go.kr/board/actionBoard0021List.do?selectPage=5)와 [국립수산물품질관리원 안내](https://www.fsis.go.kr/front/contents/cmsList.do?cate_id=0609)를 기준으로 확인합니다.

## 2. Worker 배포

```powershell
cd worker
npm install
npx wrangler login
npx wrangler secret put DATA_GO_KR_SERVICE_KEY
npx wrangler secret put FOOD_SAFETY_KOREA_API_KEY
```

`wrangler.toml`에는 현재 데이터셋의 호출 URL
`https://apis.data.go.kr/1192000/OceansWemoObvpRtmInfoService/OceansWemoObvpRtmInfo`가 기본값으로 들어 있습니다. 데이터셋 페이지에서 발급된 키를 로컬에서 시험할 때는 `worker/.dev.vars`에 `DATA_GO_KR_SERVICE_KEY`를 넣습니다. 이 파일은 Git에 추적되지 않습니다.

Cloudflare에 배포할 때는 키를 파일이나 프런트엔드에 올리지 말고 Worker Secret으로 등록합니다.

```powershell
npm run typecheck
npm test
npm run deploy
```

## 3. GitHub Pages 프런트엔드 연결

프로젝트 루트에 `.env.local`을 만들고 Worker 주소만 넣습니다.

```env
VITE_DATA_API_BASE_URL=https://<worker-name>.<account-subdomain>.workers.dev
```

키 값은 이 파일이나 GitHub Pages에 넣지 않습니다. GitHub Actions로 빌드할 때도 Worker 주소만 `VITE_DATA_API_BASE_URL`로 전달합니다.

## 응답 원칙

Worker와 프런트엔드는 `success`, `unavailable`, `error`, `stale` 상태를 구분합니다. 응답이 없거나 공식 페이지 구조를 해석할 수 없을 때에는 최신 정보 없음·판단 보류로 표시하며, 임의의 수온·패류독소 수치·위험 점수를 만들지 않습니다. 패류독소 속보가 있어도 위치별 채취금지 여부를 자동으로 확실히 확인하지 못하면 원문 확인을 요구합니다.

## 한계

이 프로토타입은 의료 진단이나 안전 보증 서비스가 아닙니다. 해양환경 관측값만으로 해산물의 섭취 안전성을 결론내리지 않으며, 판매처의 회수 안내·제품 표시·공식 원문을 함께 확인해야 합니다. 보관 시뮬레이터와 사진 효과는 교육용 시각화입니다.
