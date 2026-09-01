# 이미지 폴더

협력기업 로고 등 사이트에서 쓰는 이미지를 여기에 넣습니다.

- 파일명은 **영문·숫자·하이픈**만 사용하세요. 한글 파일명은 배포 과정에서 깨지는 경우가 있습니다.
  - 예: `dail-logo.png`, `drhealer-logo.png`
- 로고는 정사각형에 가까운 PNG(투명 배경) 또는 SVG 를 권장합니다. 짧은 변 200px 이상이면 충분합니다.
- 넣은 뒤 `public/data/partners.json` 의 해당 회사 `logo` 값에 경로를 적으면 바로 반영됩니다.

```json
"logo": "/assets/img/dail-logo.png"
```
