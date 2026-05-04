# Design System — 부동산 AI 어시스턴트 공식 디자인 시스템

> **공식 채택**: 이 파일은 본 프로젝트의 **공식 디자인 시스템**입니다. Apple 웹사이트의 디자인 언어를 기반으로 CRM 앱에 필요한 컴포넌트를 보완한 완전한 명세입니다.
>
> **폰트**: SF Pro는 Apple 독점 서체이므로 웹에서 `Pretendard`(오픈소스 SF Pro 한국어 동등체)로 대체합니다. Apple 기기에서는 `-apple-system` 폴백으로 SF Pro가 자동 적용됩니다.
>
> **색상**: 섹션 1~9는 Apple 웹사이트 원본 스펙. 섹션 10 이후는 CRM 앱 전용 보완 명세(한국어 폰트·상태 색상·앱 컴포넌트)입니다.

## 1. Visual Theme & Atmosphere

Apple's website is a masterclass in controlled drama — vast expanses of pure black and near-white serve as cinematic backdrops for products that are photographed as if they were sculptures in a gallery. The design philosophy is reductive to its core: every pixel exists in service of the product, and the interface itself retreats until it becomes invisible. This is not minimalism as aesthetic preference; it is minimalism as reverence for the object.

The typography anchors everything. San Francisco (SF Pro Display for large sizes, SF Pro Text for body) is Apple's proprietary typeface, engineered with optical sizing that automatically adjusts letterforms depending on point size. At display sizes (56px), weight 600 with a tight line-height of 1.07 and subtle negative letter-spacing (-0.28px) creates headlines that feel machined rather than typeset — precise, confident, and unapologetically direct. At body sizes (17px), the tracking loosens slightly (-0.374px) and line-height opens to 1.47, creating a reading rhythm that is comfortable without ever feeling slack.

The color story is starkly binary. Product sections alternate between pure black (`#000000`) backgrounds with white text and light gray (`#f5f5f7`) backgrounds with near-black text (`#1d1d1f`). This creates a cinematic pacing — dark sections feel immersive and premium, light sections feel open and informational. The only chromatic accent is Apple Blue (`#0071e3`), reserved exclusively for interactive elements: links, buttons, and focus states. This singular accent color in a sea of neutrals gives every clickable element unmistakable visibility.

**Key Characteristics:**
- SF Pro Display/Text with optical sizing — letterforms adapt automatically to size context
- Binary light/dark section rhythm: black (`#000000`) alternating with light gray (`#f5f5f7`)
- Single accent color: Apple Blue (`#0071e3`) reserved exclusively for interactive elements
- Product-as-hero photography on solid color fields — no gradients, no textures, no distractions
- Extremely tight headline line-heights (1.07-1.14) creating compressed, billboard-like impact
- Full-width section layout with centered content — the viewport IS the canvas
- Pill-shaped CTAs (980px radius) creating soft, approachable action buttons
- Generous whitespace between sections allowing each product moment to breathe

## 2. Color Palette & Roles

### Primary
- **Pure Black** (`#000000`): Hero section backgrounds, immersive product showcases. The darkest canvas for the brightest products.
- **Light Gray** (`#f5f5f7`): Alternate section backgrounds, informational areas. Not white — the slight blue-gray tint prevents sterility.
- **Near Black** (`#1d1d1f`): Primary text on light backgrounds, dark button fills. Slightly warmer than pure black for comfortable reading.

### Interactive
- **Apple Blue** (`#0071e3`): `--sk-focus-color`, primary CTA backgrounds, focus rings. The ONLY chromatic color in the interface.
- **Link Blue** (`#0066cc`): `--sk-body-link-color`, inline text links. Slightly darker than Apple Blue for text-level readability.
- **Bright Blue** (`#2997ff`): Links on dark backgrounds. Higher luminance for contrast on black sections.

### Text
- **White** (`#ffffff`): Text on dark backgrounds, button text on blue/dark CTAs.
- **Near Black** (`#1d1d1f`): Primary body text on light backgrounds.
- **Black 80%** (`rgba(0, 0, 0, 0.8)`): Secondary text, nav items on light backgrounds. Slightly softened.
- **Black 48%** (`rgba(0, 0, 0, 0.48)`): Tertiary text, disabled states, carousel controls.

### Surface & Dark Variants
- **Dark Surface 1** (`#272729`): Card backgrounds in dark sections.
- **Dark Surface 2** (`#262628`): Subtle surface variation in dark contexts.
- **Dark Surface 3** (`#28282a`): Elevated cards on dark backgrounds.
- **Dark Surface 4** (`#2a2a2d`): Highest dark surface elevation.
- **Dark Surface 5** (`#242426`): Deepest dark surface tone.

### Button States
- **Button Active** (`#ededf2`): Active/pressed state for light buttons.
- **Button Default Light** (`#fafafc`): Search/filter button backgrounds.
- **Overlay** (`rgba(210, 210, 215, 0.64)`): Media control scrims, overlays.
- **White 32%** (`rgba(255, 255, 255, 0.32)`): Hover state on dark modal close buttons.

### Shadows
- **Card Shadow** (`rgba(0, 0, 0, 0.22) 3px 5px 30px 0px`): Soft, diffused elevation for product cards. Offset and wide blur create a natural, photographic shadow.

## 3. Typography Rules

### Font Family
- **Display**: `SF Pro Display`, with fallbacks: `SF Pro Icons, Helvetica Neue, Helvetica, Arial, sans-serif`
- **Body**: `SF Pro Text`, with fallbacks: `SF Pro Icons, Helvetica Neue, Helvetica, Arial, sans-serif`
- SF Pro Display is used at 20px and above; SF Pro Text is optimized for 19px and below.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display Hero | SF Pro Display | 56px (3.50rem) | 600 | 1.07 (tight) | -0.28px | Product launch headlines, maximum impact |
| Section Heading | SF Pro Display | 40px (2.50rem) | 600 | 1.10 (tight) | normal | Feature section titles |
| Tile Heading | SF Pro Display | 28px (1.75rem) | 400 | 1.14 (tight) | 0.196px | Product tile headlines |
| Card Title | SF Pro Display | 21px (1.31rem) | 700 | 1.19 (tight) | 0.231px | Bold card headings |
| Sub-heading | SF Pro Display | 21px (1.31rem) | 400 | 1.19 (tight) | 0.231px | Regular card headings |
| Nav Heading | SF Pro Text | 34px (2.13rem) | 600 | 1.47 | -0.374px | Large navigation headings |
| Sub-nav | SF Pro Text | 24px (1.50rem) | 300 | 1.50 | normal | Light sub-navigation text |
| Body | SF Pro Text | 17px (1.06rem) | 400 | 1.47 | -0.374px | Standard reading text |
| Body Emphasis | SF Pro Text | 17px (1.06rem) | 600 | 1.24 (tight) | -0.374px | Emphasized body text, labels |
| Button Large | SF Pro Text | 18px (1.13rem) | 300 | 1.00 (tight) | normal | Large button text, light weight |
| Button | SF Pro Text | 17px (1.06rem) | 400 | 2.41 (relaxed) | normal | Standard button text |
| Link | SF Pro Text | 14px (0.88rem) | 400 | 1.43 | -0.224px | Body links, "Learn more" |
| Caption | SF Pro Text | 14px (0.88rem) | 400 | 1.29 (tight) | -0.224px | Secondary text, descriptions |
| Caption Bold | SF Pro Text | 14px (0.88rem) | 600 | 1.29 (tight) | -0.224px | Emphasized captions |
| Micro | SF Pro Text | 12px (0.75rem) | 400 | 1.33 | -0.12px | Fine print, footnotes |
| Micro Bold | SF Pro Text | 12px (0.75rem) | 600 | 1.33 | -0.12px | Bold fine print |
| Nano | SF Pro Text | 10px (0.63rem) | 400 | 1.47 | -0.08px | Legal text, smallest size |

### Principles
- **Optical sizing as philosophy**: SF Pro automatically switches between Display and Text optical sizes. Display versions have wider letter spacing and thinner strokes optimized for large sizes; Text versions are tighter and sturdier for small sizes. This means the font literally changes its DNA based on context.
- **Weight restraint**: The scale spans 300 (light) to 700 (bold) but most text lives at 400 (regular) and 600 (semibold). Weight 300 appears only on large decorative text. Weight 700 is rare, used only for bold card titles.
- **Negative tracking at all sizes**: Unlike most systems that only track headlines, Apple applies subtle negative letter-spacing even at body sizes (-0.374px at 17px, -0.224px at 14px, -0.12px at 12px). This creates universally tight, efficient text.
- **Extreme line-height range**: Headlines compress to 1.07 while body text opens to 1.47, and some button contexts stretch to 2.41. This dramatic range creates clear visual hierarchy through rhythm alone.

## 4. Component Stylings

### Buttons

**Primary Blue (CTA)**
- Background: `#0071e3` (Apple Blue)
- Text: `#ffffff`
- Padding: 8px 15px
- Radius: 8px
- Border: 1px solid transparent
- Font: SF Pro Text, 17px, weight 400
- Hover: background brightens slightly
- Active: `#ededf2` background shift
- Focus: `2px solid var(--sk-focus-color, #0071E3)` outline
- Use: Primary call-to-action ("Buy", "Shop iPhone")

**Primary Dark**
- Background: `#1d1d1f`
- Text: `#ffffff`
- Padding: 8px 15px
- Radius: 8px
- Font: SF Pro Text, 17px, weight 400
- Use: Secondary CTA, dark variant

**Pill Link (Learn More / Shop)**
- Background: transparent
- Text: `#0066cc` (light bg) or `#2997ff` (dark bg)
- Radius: 980px (full pill)
- Border: 1px solid `#0066cc`
- Font: SF Pro Text, 14px-17px
- Hover: underline decoration
- Use: "Learn more" and "Shop" links — the signature Apple inline CTA

**Filter / Search Button**
- Background: `#fafafc`
- Text: `rgba(0, 0, 0, 0.8)`
- Padding: 0px 14px
- Radius: 11px
- Border: 3px solid `rgba(0, 0, 0, 0.04)`
- Focus: `2px solid var(--sk-focus-color, #0071E3)` outline
- Use: Search bars, filter controls

**Media Control**
- Background: `rgba(210, 210, 215, 0.64)`
- Text: `rgba(0, 0, 0, 0.48)`
- Radius: 50% (circular)
- Active: scale(0.9), background shifts
- Focus: `2px solid var(--sk-focus-color, #0071e3)` outline, white bg, black text
- Use: Play/pause, carousel arrows

### Cards & Containers
- Background: `#f5f5f7` (light) or `#272729`-`#2a2a2d` (dark)
- Border: none (borders are rare in Apple's system)
- Radius: 5px-8px
- Shadow: `rgba(0, 0, 0, 0.22) 3px 5px 30px 0px` for elevated product cards
- Content: centered, generous padding
- Hover: no standard hover state — cards are static, links within them are interactive

### Navigation
- Background: `rgba(0, 0, 0, 0.8)` (translucent dark) with `backdrop-filter: saturate(180%) blur(20px)`
- Height: 48px (compact)
- Text: `#ffffff` at 12px, weight 400
- Active: underline on hover
- Logo: Apple logomark (SVG) centered or left-aligned, 17x48px viewport
- Mobile: collapses to hamburger with full-screen overlay menu
- The nav floats above content, maintaining its dark translucent glass regardless of section background

### Image Treatment
- Products on solid-color fields (black or white) — no backgrounds, no context, just the object
- Full-bleed section images that span the entire viewport width
- Product photography at extremely high resolution with subtle shadows
- Lifestyle images confined to rounded-corner containers (12px+ radius)

### Distinctive Components

**Product Hero Module**
- Full-viewport-width section with solid background (black or `#f5f5f7`)
- Product name as the primary headline (SF Pro Display, 56px, weight 600)
- One-line descriptor below in lighter weight
- Two pill CTAs side by side: "Learn more" (outline) and "Buy" / "Shop" (filled)

**Product Grid Tile**
- Square or near-square card on contrasting background
- Product image dominating 60-70% of the tile
- Product name + one-line description below
- "Learn more" and "Shop" link pair at bottom

**Feature Comparison Strip**
- Horizontal scroll of product variants
- Each variant as a vertical card with image, name, and key specs
- Minimal chrome — the products speak for themselves

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: 2px, 4px, 5px, 6px, 7px, 8px, 9px, 10px, 11px, 14px, 15px, 17px, 20px, 24px
- Notable characteristic: the scale is dense at small sizes (2-11px) with granular 1px increments, then jumps in larger steps. This allows precise micro-adjustments for typography and icon alignment.

### Grid & Container
- Max content width: approximately 980px (the recurring "980px radius" in pill buttons echoes this width)
- Hero: full-viewport-width sections with centered content block
- Product grids: 2-3 column layouts within centered container
- Single-column for hero moments — one product, one message, full attention
- No visible grid lines or gutters — spacing creates implied structure

### Whitespace Philosophy
- **Cinematic breathing room**: Each product section occupies a full viewport height (or close to it). The whitespace between products is not empty — it is the pause between scenes in a film.
- **Vertical rhythm through color blocks**: Rather than using spacing alone to separate sections, Apple uses alternating background colors (black, `#f5f5f7`, white). Each color change signals a new "scene."
- **Compression within, expansion between**: Text blocks are tightly set (negative letter-spacing, tight line-heights) while the space surrounding them is vast. This creates a tension between density and openness.

### Border Radius Scale
- Micro (5px): Small containers, link tags
- Standard (8px): Buttons, product cards, image containers
- Comfortable (11px): Search inputs, filter buttons
- Large (12px): Feature panels, lifestyle image containers
- Full Pill (980px): CTA links ("Learn more", "Shop"), navigation pills
- Circle (50%): Media controls (play/pause, arrows)

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow, solid background | Standard content sections, text blocks |
| Navigation Glass | `backdrop-filter: saturate(180%) blur(20px)` on `rgba(0,0,0,0.8)` | Sticky navigation bar — the glass effect |
| Subtle Lift (Level 1) | `rgba(0, 0, 0, 0.22) 3px 5px 30px 0px` | Product cards, floating elements |
| Media Control | `rgba(210, 210, 215, 0.64)` background with scale transforms | Play/pause buttons, carousel controls |
| Focus (Accessibility) | `2px solid #0071e3` outline | Keyboard focus on all interactive elements |

**Shadow Philosophy**: Apple uses shadow extremely sparingly. The primary shadow (`3px 5px 30px` with 0.22 opacity) is soft, wide, and offset — mimicking a diffused studio light casting a natural shadow beneath a physical object. This reinforces the "product as physical sculpture" metaphor. Most elements have NO shadow at all; elevation comes from background color contrast (dark card on darker background, or light card on slightly different gray).

### Decorative Depth
- Navigation glass: the translucent, blurred navigation bar is the most recognizable depth element, creating a sense of floating UI above scrolling content
- Section color transitions: depth is implied by the alternation between black and light gray sections rather than by shadows
- Product photography shadows: the products themselves cast shadows in their photography, so the UI doesn't need to add synthetic ones

## 7. Do's and Don'ts

### Do
- Use SF Pro Display at 20px+ and SF Pro Text below 20px — respect the optical sizing boundary
- Apply negative letter-spacing at all text sizes (not just headlines) — Apple tracks tight universally
- Use Apple Blue (`#0071e3`) ONLY for interactive elements — it must be the singular accent
- Alternate between black and light gray (`#f5f5f7`) section backgrounds for cinematic rhythm
- Use 980px pill radius for CTA links — the signature Apple link shape
- Keep product imagery on solid-color fields with no competing visual elements
- Use the translucent dark glass (`rgba(0,0,0,0.8)` + blur) for sticky navigation
- Compress headline line-heights to 1.07-1.14 — Apple headlines are famously tight

### Don't
- Don't introduce additional accent colors — the entire chromatic budget is spent on blue
- Don't use heavy shadows or multiple shadow layers — Apple's shadow system is one soft diffused shadow or nothing
- Don't use borders on cards or containers — Apple almost never uses visible borders (except on specific buttons)
- Don't apply wide letter-spacing to SF Pro — it is designed to run tight at every size
- Don't use weight 800 or 900 — the maximum is 700 (bold), and even that is rare
- Don't add textures, patterns, or gradients to backgrounds — solid colors only
- Don't make the navigation opaque — the glass blur effect is essential to the Apple UI identity
- Don't center-align body text — Apple body copy is left-aligned; only headlines center
- Don't use rounded corners larger than 12px on rectangular elements (980px is for pills only)

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Small Mobile | <360px | Minimum supported, single column |
| Mobile | 360-480px | Standard mobile layout |
| Mobile Large | 480-640px | Wider single column, larger images |
| Tablet Small | 640-834px | 2-column product grids begin |
| Tablet | 834-1024px | Full tablet layout, expanded nav |
| Desktop Small | 1024-1070px | Standard desktop layout begins |
| Desktop | 1070-1440px | Full layout, max content width |
| Large Desktop | >1440px | Centered with generous margins |

### Touch Targets
- Primary CTAs: 8px 15px padding creating ~44px touch height
- Navigation links: 48px height with adequate spacing
- Media controls: 50% radius circular buttons, minimum 44x44px
- "Learn more" pills: generous padding for comfortable tapping

### Collapsing Strategy
- Hero headlines: 56px Display → 40px → 28px on mobile, maintaining tight line-height proportionally
- Product grids: 3-column → 2-column → single column stacked
- Navigation: full horizontal nav → compact mobile menu (hamburger)
- Product hero modules: full-bleed maintained at all sizes, text scales down
- Section backgrounds: maintain full-width color blocks at all breakpoints — the cinematic rhythm never breaks
- Image sizing: products scale proportionally, never crop — the product silhouette is sacred

### Image Behavior
- Product photography maintains aspect ratio at all breakpoints
- Hero product images scale down but stay centered
- Full-bleed section backgrounds persist at every size
- Lifestyle images may crop on mobile but maintain their rounded corners
- Lazy loading for below-fold product images

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA: Apple Blue (`#0071e3`)
- Page background (light): `#f5f5f7`
- Page background (dark): `#000000`
- Heading text (light): `#1d1d1f`
- Heading text (dark): `#ffffff`
- Body text: `rgba(0, 0, 0, 0.8)` on light, `#ffffff` on dark
- Link (light bg): `#0066cc`
- Link (dark bg): `#2997ff`
- Focus ring: `#0071e3`
- Card shadow: `rgba(0, 0, 0, 0.22) 3px 5px 30px 0px`

### Example Component Prompts
- "Create a hero section on black background. Headline at 56px SF Pro Display weight 600, line-height 1.07, letter-spacing -0.28px, color white. One-line subtitle at 21px SF Pro Display weight 400, line-height 1.19, color white. Two pill CTAs: 'Learn more' (transparent bg, white text, 1px solid white border, 980px radius) and 'Buy' (Apple Blue #0071e3 bg, white text, 8px radius, 8px 15px padding)."
- "Design a product card: #f5f5f7 background, 8px border-radius, no border, no shadow. Product image top 60% of card on solid background. Title at 28px SF Pro Display weight 400, letter-spacing 0.196px, line-height 1.14. Description at 14px SF Pro Text weight 400, color rgba(0,0,0,0.8). 'Learn more' and 'Shop' links in #0066cc at 14px."
- "Build the Apple navigation: sticky, 48px height, background rgba(0,0,0,0.8) with backdrop-filter: saturate(180%) blur(20px). Links at 12px SF Pro Text weight 400, white text. Apple logo left, links centered, search and bag icons right."
- "Create an alternating section layout: first section black bg with white text and centered product image, second section #f5f5f7 bg with #1d1d1f text. Each section near full-viewport height with 56px headline and two pill CTAs below."
- "Design a 'Learn more' link: text #0066cc on light bg or #2997ff on dark bg, 14px SF Pro Text, underline on hover. After the text, include a right-arrow chevron character (>). Wrap in a container with 980px border-radius for pill shape when used as a standalone CTA."

### Iteration Guide
1. Every interactive element gets Apple Blue (`#0071e3`) — no other accent colors
2. Section backgrounds alternate: black for immersive moments, `#f5f5f7` for informational moments
3. Typography optical sizing: SF Pro Display at 20px+, SF Pro Text below — never mix
4. Negative letter-spacing at all sizes: -0.28px at 56px, -0.374px at 17px, -0.224px at 14px, -0.12px at 12px
5. The navigation glass effect (translucent dark + blur) is non-negotiable — it defines the Apple web experience
6. Products always appear on solid color fields — never on gradients, textures, or lifestyle backgrounds in hero modules
7. Shadow is rare and always soft: `3px 5px 30px 0.22 opacity` or nothing at all
8. Pill CTAs use 980px radius — this creates the signature Apple rounded-rectangle-that-looks-like-a-capsule shape

---

## 10. 한국어 적용 전략 (Korean Typography Adaptation)

### 폰트 스택

SF Pro는 Apple 독점 서체로 웹 라이선스 제약이 있다. `Pretendard`를 기본 서체로 사용한다. Pretendard는 SF Pro의 광학 특성(자간·자형·두께 시스템)을 한국어+라틴 혼용 환경에 맞게 재현한 오픈소스 서체다.

```css
/* globals.css */
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

:root {
  --font-display: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-text:    'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}

body {
  font-family: var(--font-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  word-break: keep-all; /* 한국어 줄바꿈 최적화 */
}
```

Apple 기기에서는 `-apple-system` 폴백으로 SF Pro가 자동 적용되어 최적 경험을 제공한다.

### 한국어 타이포그래피 조정

영문 기준으로 설계된 Apple 타입 스케일을 한국어에 맞게 조정한다.

| 항목 | 영문 원본 | 한국어 조정 | 이유 |
|---|---|---|---|
| Body line-height | 1.47 | 1.7 | 한국어 자소 높이로 인해 줄 겹침 방지 |
| Headline line-height | 1.07~1.14 | 1.2~1.3 | 한국어 헤드라인은 영문보다 줄높이 필요 |
| Letter-spacing (body) | -0.374px | 0 | Pretendard는 음수 자간 조정 불필요 |
| Letter-spacing (headline) | -0.28px | -0.5px | 큰 사이즈에서만 소폭 조정 |
| word-break | normal | keep-all | 어절 단위 줄바꿈 |

```css
/* 한국어 적용 타이포그래피 토큰 */
:root {
  --text-display: 600 56px/1.25 var(--font-display);   /* 대형 제목 */
  --text-section: 600 40px/1.25 var(--font-display);   /* 섹션 제목 */
  --text-card:    400 21px/1.33 var(--font-display);   /* 카드 제목 */
  --text-body:    400 15px/1.7  var(--font-text);      /* 본문 */
  --text-label:   400 13px/1.5  var(--font-text);      /* 레이블·캡션 */
  --text-micro:   400 11px/1.45 var(--font-text);      /* 뱃지·태그 */
}
```

---

## 11. 시맨틱 색상 확장 (Semantic Color Extension)

Apple의 단일 액센트 원칙(#0071e3만 사용)은 마케팅 웹사이트 기준이다. CRM 앱에서 위험도·거래 상태·시스템 피드백은 **데이터 시각화 색상**으로 별도 처리한다. Apple iOS Human Interface Guidelines의 System Colors를 채택하여 Apple 디자인 정체성을 유지한다.

### 인터랙티브 색상 (변경 없음)
- **Apple Blue** `#0071e3` — 버튼·링크·포커스 링·선택 상태. 유일한 브랜드 액센트.

### 시스템 상태 색상 (iOS HIG System Colors)
```css
:root {
  /* 성공·완료·안전 */
  --color-success:        #34c759;  /* Apple System Green */
  --color-success-light:  #d1f5db;  /* 배경용 (10% 불투명도) */

  /* 주의·경고 */
  --color-warning:        #ff9f0a;  /* Apple System Orange */
  --color-warning-light:  #fff3d1;

  /* 위험·오류·거절 */
  --color-danger:         #ff3b30;  /* Apple System Red */
  --color-danger-light:   #ffe5e3;

  /* 중립·미확인·비활성 */
  --color-neutral:        #636366;  /* Apple System Gray */
  --color-neutral-light:  #f2f2f7;

  /* 정보·안내 */
  --color-info:           #5ac8fa;  /* Apple System Light Blue */
  --color-info-light:     #e5f6fe;
}
```

### 사용 원칙

| 색상 | 사용 맥락 | 절대 사용 금지 |
|---|---|---|
| Apple Blue `#0071e3` | 버튼·링크·체크박스·포커스·선택 | 상태 표시, 데이터 색상 |
| Green `#34c759` | 위험 없음·완료·납부 완료·안전 | 브랜드 액센트 |
| Orange `#ff9f0a` | 주의·경고·만료 임박·집중 관리 | 버튼 |
| Red `#ff3b30` | 위험·오류·압류·경매·위반건축물 | 일반 텍스트 |
| Gray `#636366` | 미진단·비활성·선택 해제 | 본문 텍스트 |

---

## 12. 앱 셸 레이아웃 (App Shell Layout)

CRM 앱은 마케팅 사이트의 전폭 섹션 레이아웃 대신 **3열 앱 셸**을 사용한다.

### 레이아웃 구조

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (240px)  │     Main Content      │  Panel  │
│                   │                       │ (400px) │
│  · 로고            │  · 페이지 헤더          │         │
│  · 네비 링크       │  · 데이터 리스트         │  (선택)  │
│  · 사용자 정보     │  · 콘텐츠 영역           │         │
└─────────────────────────────────────────────────────┘
```

### 사이드바 (Sidebar)

Apple의 네비게이션 글래스 효과를 사이드바에 적용한다.

```css
.sidebar {
  width: 240px;
  height: 100vh;
  position: fixed;
  left: 0; top: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  z-index: 100;
}
```

**사이드바 네비 링크:**
- 기본: `color: rgba(255,255,255,0.65)` / `font-size: 14px` / `padding: 10px 20px`
- 호버: `color: #ffffff` / `background: rgba(255,255,255,0.08)`
- 활성: `color: #ffffff` / `background: rgba(255,255,255,0.12)` / 왼쪽 3px 흰색 선
- 아이콘 + 텍스트 조합, 아이콘 크기 16px
- 섹션 구분: `font-size: 11px` / `color: rgba(255,255,255,0.35)` / `text-transform: uppercase` / `letter-spacing: 0.08em`

### 메인 콘텐츠 영역

```css
.main-content {
  margin-left: 240px;
  min-height: 100vh;
  background: #f5f5f7;    /* Apple Light Gray */
  padding: 0;
}

.page-header {
  background: rgba(245, 245, 247, 0.85);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 50;
}
```

### 우측 슬라이드 패널 (섹션 16 참고)

---

## 13. 폼 컴포넌트 (Form Components)

### 텍스트 인풋

```
기본 상태: #ffffff 배경 / 1px solid rgba(0,0,0,0.18) 테두리 / 8px radius
포커스:    1px solid #0071e3 / 0 0 0 3px rgba(0,113,227,0.15) 외곽 글로우
에러:      1px solid #ff3b30 / 0 0 0 3px rgba(255,59,48,0.12) 외곽 글로우
비활성:    #f5f5f7 배경 / rgba(0,0,0,0.08) 테두리
```

- 폰트: 15px / weight 400 / `#1d1d1f`
- 플레이스홀더: `rgba(0,0,0,0.35)`
- 패딩: 10px 14px
- 높이: 40px (기본) / 36px (소형)
- 레이블: 13px / weight 500 / `#1d1d1f` / 인풋 위 6px 간격

**주소 검색 인풋** (전용 스타일):
- 높이: 48px
- 배경: `#ffffff` with 미묘한 그림자 `rgba(0,0,0,0.08) 0 2px 8px`
- 검색 아이콘 좌측 14px 위치
- 오토컴플릿 드롭다운: `#ffffff` / `border-radius: 8px` / 동일 그림자 + 위쪽 border-radius 0

### 셀렉트 / 드롭다운

- 기본 인풋과 동일 스타일
- 우측 chevron 아이콘 (`rgba(0,0,0,0.35)`)
- 드롭다운 패널: `#ffffff` / `8px radius` / `box-shadow: rgba(0,0,0,0.18) 0 4px 20px`
- 옵션: `padding: 10px 14px` / 호버: `#f5f5f7` / 선택: Apple Blue 텍스트

### 체크박스 & 라디오

- 기본 크기: 18×18px / `border-radius: 4px` (체크박스) / `50%` (라디오)
- 비활성: `rgba(0,0,0,0.12)` 테두리
- 활성: `#0071e3` 배경 + 흰색 체크마크/점
- 레이블: 14px / `#1d1d1f` / 왼쪽 8px 간격

### 텍스트에어리어

- 인풋과 동일 스타일
- 최소 높이: 96px / `resize: vertical`
- 우하단 drag handle 유지 (브라우저 기본)

### 파일 업로드

```
배경:    #f5f5f7 (드래그 오버: rgba(0,113,227,0.05))
테두리: 1px dashed rgba(0,0,0,0.18) (드래그 오버: #0071e3)
radius:  8px
패딩:    24px
```

- 중앙: 업로드 아이콘(24px) + "클릭하거나 파일을 이 영역으로 끌어오세요" (14px / `rgba(0,0,0,0.5)`)
- 지원 형식: 12px / `rgba(0,0,0,0.35)` / 아이콘 아래 8px
- 업로드 중: Apple Blue 프로그레스 바 (하단 2px)

### 에러 메시지

- 인풋 아래 6px
- `font-size: 12px` / `color: #ff3b30`
- 경고 아이콘 + 텍스트 조합

---

## 14. 데이터 리스트 (Data List / Table)

매물 목록 등 데이터 밀집형 리스트에 적용.

### 리스트 컨테이너

```css
.data-list {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: rgba(0, 0, 0, 0.06) 0 1px 4px;
}
```

### 헤더 행

- 배경: `#f5f5f7`
- 셀: `font-size: 12px` / `weight 500` / `color: rgba(0,0,0,0.5)` / `padding: 10px 16px`
- 정렬 가능 열: 호버 시 정렬 화살표 표시 (Apple Blue)

### 데이터 행

```
기본:   background #ffffff / padding 14px 16px
호버:   background #f5f5f7
선택:   background rgba(0,113,227,0.06) / 왼쪽 3px Apple Blue 선
구분선: 1px solid rgba(0,0,0,0.06) (하단, 마지막 행 제외)
```

- 주 정보: `font-size: 14px` / `weight 500` / `#1d1d1f`
- 부 정보: `font-size: 13px` / `weight 400` / `rgba(0,0,0,0.5)`
- 행 높이: 최소 56px (뱃지 포함 시 자동 높이)

### 로딩 스켈레톤

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
}
```

- 텍스트 스켈레톤: 높이 14px / 너비 60~80% / 2px radius
- 배지 스켈레톤: 높이 20px / 너비 48px / 10px radius

### 빈 상태 (Empty State)

- 아이콘: 48px (흑백, 회색 `rgba(0,0,0,0.2)`)
- 제목: 17px / weight 600 / `#1d1d1f`
- 설명: 14px / `rgba(0,0,0,0.5)` / 제목 아래 6px
- CTA 버튼 (선택): Apple Blue 기본 버튼 / 설명 아래 20px
- 전체 수직 중앙 정렬, `padding: 48px 24px`

### 페이지네이션

- 이전/다음 버튼: 필터 버튼 스타일 (`#fafafc` 배경 / `11px radius`)
- 현재 페이지: Apple Blue 배경 / 흰색 텍스트
- 폰트: 14px / `#1d1d1f`

---

## 15. 배지·태그 시스템 (Badge & Tag System)

### 위험 태그 (Risk Tags)

매물 리스트에서 위험 항목을 즉시 식별하는 인라인 태그.

```
공통 스타일: font-size 11px / weight 500 / padding 3px 7px / border-radius 4px
```

| 태그 | 배경 | 텍스트 | 항목 |
|---|---|---|---|
| `위반` | `#ffe5e3` | `#cc2c23` | 위반건축물 |
| `경매` | `#ffe5e3` | `#cc2c23` | 경매개시결정 |
| `압류` | `#ffe5e3` | `#cc2c23` | 압류·가압류 |
| `근저당` | `#fff0d9` | `#c67800` | 근저당권 |
| `가처분` | `#fff0d9` | `#c67800` | 처분금지가처분 |
| `임차권등기` | `#fff0d9` | `#c67800` | 임차권등기명령 |
| `신탁` | `#f2f2f7` | `#3a3a3c` | 신탁 |
| `토지거래허가` | `#e5f0ff` | `#0051a8` | 토지거래허가구역 |
| `재개발·재건축` | `#f0e5ff` | `#6200a8` | 재개발·재건축 구역 |
| `투기과열` | `#e5f0ff` | `#0051a8` | 투기과열지구 |

### 위험도 컬러 배지 (Risk Level Badge)

```
없음:   background #d1f5db / text #1a7a34 / 점 #34c759
주의:   background #fff3d1 / text #a05c00 / 점 #ff9f0a
위험:   background #ffe5e3 / text #cc2c23 / 점 #ff3b30
확인중: background #f2f2f7 / text #636366 / 점 animate(pulse)
```

### 매물 라벨 (Property Labels)

3종 중복 적용 가능.

```
공통: font-size 12px / weight 500 / padding 3px 8px / border-radius 980px (pill)
```

| 라벨 | 배경 | 텍스트 |
|---|---|---|
| 우리 매물 | `#0071e3` | `#ffffff` |
| 관심 매물 | `rgba(0,113,227,0.1)` | `#0051a8` |
| 집중 관리 | `#ff9f0a` | `#ffffff` |

### 거래 상태 칩 (Transaction Status Chips)

```
공통: font-size 12px / weight 400 / padding 3px 10px / border-radius 980px
```

| 상태 | 배경 | 텍스트 |
|---|---|---|
| 임대중 / 매매완료 | `#d1f5db` | `#1a7a34` |
| 중개진행중 | `#e5f0ff` | `#0051a8` |
| 만료예정 | `#fff3d1` | `#a05c00` |
| 계약만료 / 공실 | `#f2f2f7` | `#636366` |
| 계약파기 | `#ffe5e3` | `#cc2c23` |

### 플랫폼 출처 뱃지 (Platform Source Badges)

```
공통: font-size 11px / weight 600 / padding 2px 7px / border-radius 4px / border 1px solid
```

| 플랫폼 | 배경 | 텍스트 | 테두리 |
|---|---|---|---|
| 네이버 | `#e8f5e8` | `#1a7a34` | `#b5deb5` |
| 직방 | `#fff0e5` | `#a03a00` | `#f5c49a` |
| 다방 | `#fff0e5` | `#a03a00` | `#f5c49a` |
| 피터팬 | `#f0e5ff` | `#6200a8` | `#d4b5f5` |
| 구글시트 | `#f2f2f7` | `#3a3a3c` | `#d1d1d6` |

---

## 16. 슬라이드 패널 (Slide-In Panel / Drawer)

매물 리스트에서 행 클릭 시 우측에서 슬라이드인하는 상세 패널.

### 구조

```css
.slide-panel {
  position: fixed;
  right: 0; top: 0;
  width: 400px;
  height: 100vh;
  background: #ffffff;
  box-shadow: rgba(0, 0, 0, 0.18) -4px 0 24px;
  transform: translateX(100%);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1); /* ease-out-expo */
  z-index: 200;
  overflow-y: auto;
}

.slide-panel.open {
  transform: translateX(0);
}

.slide-panel-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.24);
  opacity: 0;
  transition: opacity 300ms ease;
  z-index: 190;
}

.slide-panel-overlay.open {
  opacity: 1;
}
```

### 패널 내부 구조

```
┌──────────────────────────────┐
│  [← 닫기]    매물 상세       │  헤더: 56px / 배경 흰색 / 하단 구분선
├──────────────────────────────┤
│  주소, 건물명·동호수           │  24px 패딩
│  라벨 뱃지 (우리매물 등)       │
│  위험도 배지 + 위험 태그들      │
├──────────────────────────────┤
│  [사진 썸네일 3장]             │  8px gap 그리드
├──────────────────────────────┤
│  시설 현황 태그                │
│  인물 (역할 + 이름)            │
│  거래 요약                    │
│  최근 메모 1건                │
├──────────────────────────────┤
│  [자세히 보기 →]              │  Apple Blue 전폭 버튼
└──────────────────────────────┘
```

- 닫기 버튼: 24×24px / `rgba(0,0,0,0.35)` × 아이콘
- 헤더 sticky (스크롤 시 고정)
- 섹션 구분: `1px solid rgba(0,0,0,0.06)` 수평선 + `padding: 20px 24px`

---

## 17. 탭 내비게이션 (Tab Navigation)

매물·인물·거래 상세 페이지의 섹션 전환 탭.

```css
.tabs {
  display: flex;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: #ffffff;
  padding: 0 24px;
  gap: 0;
}

.tab {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.5);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 150ms ease, border-color 150ms ease;
  white-space: nowrap;
}

.tab:hover {
  color: #1d1d1f;
}

.tab.active {
  color: #0071e3;
  font-weight: 500;
  border-bottom-color: #0071e3;
}
```

- 탭 수 많을 경우: 가로 스크롤 (`overflow-x: auto; scrollbar-width: none`)
- 모바일: 탭이 2개 이하이면 전폭 균등 배치, 3개 이상이면 스크롤

---

## 18. 토스트 알림 (Toast Notifications)

### 위치 및 애니메이션

```css
.toast-container {
  position: fixed;
  top: 20px; right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  min-width: 280px; max-width: 360px;
  padding: 14px 16px;
  border-radius: 10px;
  box-shadow: rgba(0, 0, 0, 0.18) 0 4px 20px;
  display: flex; align-items: flex-start; gap: 10px;
  animation: toast-in 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

### 토스트 유형

| 유형 | 배경 | 아이콘 색 | 사용 |
|---|---|---|---|
| 성공 | `#ffffff` + 왼쪽 3px `#34c759` 선 | `#34c759` | 저장 완료, 매물 등록 완료 |
| 오류 | `#ffffff` + 왼쪽 3px `#ff3b30` 선 | `#ff3b30` | API 오류, 저장 실패 |
| 경고 | `#ffffff` + 왼쪽 3px `#ff9f0a` 선 | `#ff9f0a` | 한도 초과 경고, 주의 사항 |
| 정보 | `#ffffff` + 왼쪽 3px `#0071e3` 선 | `#0071e3` | Quick Check 실행 중, 일반 안내 |

- 제목: `font-size: 14px` / `weight 600` / `#1d1d1f`
- 내용: `font-size: 13px` / `color: rgba(0,0,0,0.6)` / 제목 아래 2px
- 닫기 버튼: 우상단 16px × / `rgba(0,0,0,0.3)`
- 자동 소멸: 성공·정보 4초 / 경고·오류 6초 (닫기 버튼으로 수동 제거 가능)

---

## 19. 타임라인 컴포넌트 (Timeline)

거래 이력·분쟁 협의 과정·시설이력 소통 기록에 사용.

### 구조

```
  ●  2025.04.28  대납지급         ← 이벤트 유형 (13px weight 500 #1d1d1f)
  │              사무소가 임차인에게 35만원 대납
  │              ← 내용 (13px #636366)
  │
  ○  2025.04.22  영수증제출       ← 과거 이벤트
  │              임차인이 수리 후 영수증 35만원 제출
```

```css
.timeline {
  position: relative;
  padding-left: 28px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 7px; top: 8px; bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.1);
}

.timeline-item {
  position: relative;
  padding-bottom: 20px;
}

.timeline-dot {
  position: absolute;
  left: -28px; top: 4px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid rgba(0, 0, 0, 0.2);
}

.timeline-dot.latest {
  background: #0071e3;
  border-color: #0071e3;
}

.timeline-dot.warning {
  background: #ff9f0a;
  border-color: #ff9f0a;
}
```

- 날짜: `font-size: 12px` / `rgba(0,0,0,0.4)` / 이벤트 유형 우측
- 최신 이벤트 점: Apple Blue
- 경고성 이벤트(대납·분쟁): Orange 점

---

## 20. 대시보드 위젯 (Dashboard Widgets)

홈 대시보드의 6개 요약 블록.

### 요약 카드 (Summary Card)

```css
.dashboard-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: rgba(0, 0, 0, 0.06) 0 1px 4px;
}
```

- 카드 제목: `font-size: 13px` / `weight 500` / `rgba(0,0,0,0.5)` / 대문자 없음
- 수치: `font-size: 28px` / `weight 600` / `#1d1d1f` / 제목 아래 6px
- 보조 정보: `font-size: 13px` / `rgba(0,0,0,0.5)` / 수치 아래 4px

### D-N 카운트다운 배지 (Countdown Badge)

임대 만료 임박 표시.

```
D-100 ~ D-31:   background #fff3d1 / text #a05c00   (주의 — Orange 계열)
D-30 이하:       background #ffe5e3 / text #cc2c23   (위험 — Red 계열)
만료 지남:       background #ffe5e3 / text #cc2c23 / "만료" 텍스트
```

- 폰트: `font-size: 12px` / `weight 700` / `font-variant-numeric: tabular-nums`
- 크기: `padding: 3px 8px` / `border-radius: 6px`
- 숫자는 tabular-nums로 너비 고정 (떨림 방지)

### 알림 리스트 위젯

- 각 항목: 아이콘(16px) + 텍스트 + 날짜
- 중요도 높음(D-1, 위험): 빨간 점 + bold 텍스트
- 항목 호버: `background: #f5f5f7` / `border-radius: 8px`
- [전체 보기] 링크: Apple Blue / `font-size: 13px` / 우하단

---

## 21. 빈 상태 & 로딩 (Empty States & Loading)

### 로딩 스피너

Quick Check 실행 중, API 호출 중 표시.

```css
.spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #0071e3;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
```

- 작은 인라인 스피너: 16px
- 큰 페이지 로딩: 32px / 화면 중앙

### Quick Check 진행 상태

```
확인중... → 아이콘(회색 spin) + "위험 항목 확인중" 텍스트
완료       → 위험도 배지 + 위험 태그 표시
오류       → 회색 배지 "진단 오류" + [재시도] 링크
```

### 법적 고지 문구 스타일

모든 진단 리포트 하단 필수 표시.

```css
.legal-notice {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.6;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 16px;
  margin-top: 32px;
}
```

### 경고 모달 (잔금 대납 경고 등)

```css
.warning-modal {
  background: #ffffff;
  border-radius: 14px;
  padding: 28px 24px 20px;
  max-width: 360px;
  box-shadow: rgba(0, 0, 0, 0.24) 0 8px 40px;
}
```

- 경고 아이콘: 32px / `#ff9f0a`
- 제목: 17px / weight 600 / `#1d1d1f` / 아이콘 아래 12px
- 내용: 14px / `rgba(0,0,0,0.65)` / 제목 아래 8px
- 버튼 영역: 상단 `1px solid rgba(0,0,0,0.06)` + `padding-top: 16px` / 버튼 2개 가로 배치
  - [취소]: 필터 버튼 스타일 (`#fafafc`)
  - [확인]: Apple Blue 또는 Red (맥락에 따라)
- 오버레이: `rgba(0,0,0,0.4)` / 클릭 시 닫기
