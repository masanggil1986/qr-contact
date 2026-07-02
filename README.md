# 명함 QR 코드 생성기

연락처 정보를 입력하면 **vCard 3.0** 표준 QR 코드가 실시간으로 생성되는 웹 앱입니다.
생성된 QR을 휴대폰 카메라로 스캔하면 "연락처 추가"가 뜹니다. PNG(인쇄·공유용)와
SVG(벡터, 명함 디자인 삽입용)로 다운로드할 수 있습니다.

모든 처리는 브라우저 안에서만 이루어지며, 입력한 정보는 어디에도 전송되지 않습니다
(순수 클라이언트 사이드, 전체 prerender).

## 입력 필드

이름(필수), 회사, 직함, 휴대전화, 유선전화, 이메일, 웹사이트, 주소

## 개발

```sh
bun install
bun run dev        # 개발 서버 (http://localhost:5173)
```

## 테스트 · 검증

```sh
bun run test:unit -- --run   # 단위 테스트 (vCard 생성 로직)
bun run test:e2e             # Playwright e2e
bun run check                # svelte-check 타입 검사
bun run lint                 # prettier + eslint
```

## 빌드

```sh
bun run build      # 프로덕션 빌드 (prerender)
bun run preview    # 빌드 미리보기 (http://localhost:4173)
```

## 구조

```
src/
  lib/
    types.ts                  # Contact 타입
    vcard.ts                  # vCard 3.0 문자열 생성 (핵심 로직)
    qr.ts                     # qrcode 라이브러리 래퍼 (PNG/SVG)
    components/
      ContactForm.svelte      # 입력 폼
      QrPreview.svelte        # QR 미리보기 + 다운로드
  routes/
    +page.svelte              # 페이지 조립
e2e/
  generate.e2e.ts             # 해피패스 e2e
docs/superpowers/             # 설계 문서 · 구현 계획
```

## 스택

SvelteKit 2 (Svelte 5 runes) · TypeScript · Tailwind CSS 4 · [qrcode](https://github.com/soldair/node-qrcode) · Vitest · Playwright · bun

<details>
<summary>스캐폴드 재생성 명령</summary>

```sh
bun x sv@0.16.1 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:typography,forms" sveltekit-adapter="adapter:node" mcp="ide:claude-code+setup:local" --install bun qr-contact
```

</details>
