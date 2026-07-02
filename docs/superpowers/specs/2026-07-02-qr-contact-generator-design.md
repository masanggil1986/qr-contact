# 명함 QR 코드 생성기 — 설계 문서

작성일: 2026-07-02

## 목적

명함에 사용할 QR 코드를 생성하는 웹 앱. 사용자가 연락처 정보를 입력하면
실시간으로 QR 코드가 생성되고, 이미지로 다운로드할 수 있다. 생성된 QR을
휴대폰 카메라로 스캔하면 표준 방식으로 "연락처(주소록) 추가"가 뜬다.

## 핵심 결정

- **데이터 포맷**: vCard 3.0 — 가장 널리 쓰이는 표준. iOS 카메라/안드로이드 모두
  "연락처 추가"로 인식.
- **입력 필드**: 표준 명함 세트 (이름, 회사, 직함, 휴대전화, 유선전화, 이메일,
  웹사이트, 주소).
- **다운로드**: 순수 QR 이미지 — PNG(인쇄/공유용) + SVG(벡터, 명함 디자인 삽입용).
- **디자인 방향**: 깔끔한 프로페셔널 — 라이트 배경, 뉴트럴 그레이 + 블루 액센트,
  넓은 여백.
- **아키텍처**: 순수 클라이언트 사이드 (서버·DB 없음).

## 아키텍처

순수 클라이언트 사이드. 모든 처리가 브라우저 안에서 일어난다.

- **이유**: (1) 연락처(개인정보)가 서버로 전송되지 않아 안전, (2) 정적 배포 가능,
  (3) 입력 즉시 실시간 미리보기. QR 생성은 프론트 로직으로 충분하므로 서버 불필요.
- SvelteKit 페이지 하나(`/`), `prerender = true`로 정적 서빙.
- 기존 `adapter-node` 그대로 사용 (별도 어댑터 교체 없음).

## 컴포넌트 구조

```
src/
  lib/
    vcard.ts                  # buildVCard(contact): string — vCard 3.0 문자열 생성 (핵심 로직)
    qr.ts                     # toPngDataUrl / toSvgString — qrcode 라이브러리 얇은 래퍼
    types.ts                  # Contact 타입
    components/
      ContactForm.svelte      # 입력 폼 (필드들)
      QrPreview.svelte        # QR 렌더링 + PNG/SVG 다운로드 버튼
  routes/
    +page.svelte              # 상태 보유 + 폼/미리보기 조립
    +page.ts                  # export const prerender = true
```

각 단위의 책임:

- `vcard.ts`: 순수 함수. `Contact` 객체 → vCard 3.0 문자열. 특수문자 이스케이프,
  빈 필드 제외 로직 포함. 외부 의존성 없음 → 단위 테스트 대상.
- `qr.ts`: `qrcode` 라이브러리 래퍼. `toPngDataUrl(text)`, `toSvgString(text)`.
  거의 패스스루 → 테스트 제외.
- `types.ts`: `Contact` 타입 정의 (모든 필드 문자열).
- `ContactForm.svelte`: 입력 필드 UI. 부모의 `contact` 상태에 바인딩.
- `QrPreview.svelte`: `data` prop(vCard 문자열)을 받아 QR 생성·표시, 다운로드 버튼.
- `+page.svelte`: `contact` 상태 보유, `buildVCard`로 파생, 폼/미리보기 조립.

## 데이터 흐름

```
입력 → contact 상태($state)
     → vcardString = $derived(buildVCard(contact))
     → QrPreview가 $effect로 QR 재생성
        - PNG dataURL: 화면 표시 + 다운로드
        - SVG 문자열: 다운로드
```

`qrcode`의 생성 함수는 비동기이므로 `QrPreview` 내부에서 `$effect`로 `data`
변화를 감지해 QR을 재생성하고 지역 상태(pngUrl, svgString)에 저장한다. QR 생성은
가볍고 빠르므로 디바운스는 두지 않는다 (YAGNI).

## 입력 필드 → vCard 3.0 매핑

| 화면 필드     | vCard 필드            | 비고                                                   |
| ------------- | --------------------- | ------------------------------------------------------ |
| 이름 _(필수)_ | `FN` + `N`            | 스캐너가 표시하는 주 이름. FN=전체 이름, N에도 동일 값 |
| 회사          | `ORG`                 |                                                        |
| 직함          | `TITLE`               |                                                        |
| 휴대전화      | `TEL;TYPE=CELL`       |                                                        |
| 유선전화      | `TEL;TYPE=WORK,VOICE` |                                                        |
| 이메일        | `EMAIL;TYPE=WORK`     |                                                        |
| 웹사이트      | `URL`                 |                                                        |
| 주소          | `ADR;TYPE=WORK`       | 한 줄 입력. ADR의 street 컴포넌트에 전체 주소 삽입     |

규칙:

- 빈 필드는 출력에서 제외한다.
- 이름이 비면 QR을 생성하지 않고 placeholder를 표시하며 다운로드 버튼 비활성.
- **vCard 특수문자 이스케이프**: 백슬래시 `\` → `\\`, 콤마 `,` → `\,`,
  세미콜론 `;` → `\;`, 줄바꿈 → `\n`. (`vcard.ts` 핵심 로직)
- 인코딩: UTF-8, `CHARSET` 파라미터 없이. iOS 연락처 내보내기 방식과 동일하며
  iOS/안드로이드 카메라와 호환된다. **한글 스캔은 실제 기기에서 검증한다.**
- 줄 접힘(line folding, 75옥텟 초과)은 적용하지 않는다. 일반적인 명함 데이터는
  짧고 모던 스캐너는 관대하므로 생략 (YAGNI). 긴 주소로 문제가 되면 재검토.
- QR 오류정정 레벨: `M` (크기/견고성 균형).

## 라이브러리

`qrcode` (node-qrcode):

- `QRCode.toDataURL(text, opts)` → PNG data URL
- `QRCode.toString(text, { type: 'svg' })` → SVG 문자열
- 둘 다 브라우저에서 동작. 검증된 표준 라이브러리.

## 디자인 (방향 A: 깔끔한 프로페셔널)

- 라이트 배경, 뉴트럴 그레이 + 블루 액센트, 넓은 여백.
- 데스크톱: 좌측 입력 폼 / 우측 QR 미리보기 2단.
- 모바일: 세로 스택 (폼 위, 미리보기 아래).
- Tailwind 4로 구현. 세부 완성도는 `frontend-design` 스킬로 마감.
- UI 문구는 한국어.

## 에러 처리

- 이름 미입력 → QR 미생성, placeholder + 안내 문구, 다운로드 비활성.
- 이메일/URL 형식 → 가벼운 인라인 힌트만 표시하고 입력·생성은 막지 않는다.
- QR 생성 실패(데이터 과다 등) → 미리보기 영역에 에러 메시지 표시.

## 테스트

- `buildVCard` 단위 테스트 (Vitest):
  - 특수문자 이스케이프 (`,` `;` `\` 줄바꿈)
  - 빈 필드 제외
  - `BEGIN:VCARD` / `VERSION:3.0` / `END:VCARD` 구조
  - 한글 값 보존
  - 이름만 있을 때 최소 유효 vCard 생성
- `qr.ts`는 라이브러리 패스스루라 단위 테스트 제외.
- Playwright 해피패스 e2e: 폼 입력 → QR 표시 → 다운로드 버튼 활성.

## 범위 밖 (YAGNI)

- QR 색상/로고 커스터마이징
- 명함 카드 이미지 통짜 생성
- MeCard 등 다중 포맷 선택
- 연락처 저장/불러오기, 다국어 UI
