// Ensure React 18 treats this environment as supporting act()
// https://react.dev/reference/react-dom/test-utils/act#configuring-your-testing-environment
export {};

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

