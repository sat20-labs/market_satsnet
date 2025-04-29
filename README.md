# Next.js & NextUI Template

This is a template for creating applications using Next.js 13 (app directory) and NextUI (v2).

## Technologies Used

- [Next.js 13](https://nextjs.org/docs/getting-started)
- [NextUI v2](https://nextui.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Tailwind Variants](https://tailwind-variants.org)
- [TypeScript](https://www.typescriptlang.org/)
- [Framer Motion](https://www.framer.com/motion/)
- [next-themes](https://github.com/pacocoursey/next-themes)

## How to Use


### Use the template with create-next-app

To create a new project based on this template using `create-next-app`, run the following command:

```bash
npx create-next-app -e https://github.com/nextui-org/next-app-template
```

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

## License

Licensed under the [MIT license](https://github.com/nextui-org/next-app-template/blob/main/LICENSE).

## 业务组件与UI组件拆分说明

### TakeOrderContainer
- 负责业务逻辑、数据获取、状态管理。
- 通过props将数据和事件传递给TakeOrderUI。
- 通过onBuyOrders回调将用户选择的订单返回给父组件。

#### 用法示例：
```tsx
<TakeOrderContainer
  assetInfo={...}
  mode="buy"
  setMode={setMode}
  onBuyOrders={(orders) => {
    // 这里处理用户选择的订单
    console.log('用户选择的订单:', orders);
  }}
/>
```

#### Props说明：
- assetInfo: { assetName, assetLogo, AssetId, floorPrice }
- mode: "buy" | "sell"
- setMode: (mode) => void
- onBuyOrders: (orders: MarketOrder[]) => void // 用户点击Buy时回调，返回选中订单

### TakeOrderUI
- 只负责UI展示和交互，所有数据和事件通过props传入。
- 点击Buy时通过onBuy回调。

#### Props说明：
- orders: MarketOrder[]
- selectedIndexes: number[]
- maxSelectableOrders: number
- sliderValue: number
- isLoading: boolean
- isLoadingMore: boolean
- totalOrders: number
- lockedOrders: Map<number, string>
- isProcessingLock: boolean
- isBalanceSufficient: boolean
- summarySelectedOrders: any[]
- onOrderClick: (index: number) => void
- onSliderChange: (value: number) => void
- onLoadMore: () => void
- onBuy: () => void
- mode: "buy" | "sell"
- isFetching: boolean
- assetInfo: { assetName, assetLogo, AssetId, floorPrice }