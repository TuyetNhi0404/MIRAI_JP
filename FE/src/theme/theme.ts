import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

export const brandColors = {
  red: "#B90000",
  redDark: "#8A0000",
  redLight: "#FF7875",
  redSoft: "#FFF1F0",
  ink: "#1F2238",
  textPrimary: "#1F2238",
  textSecondary: "#595959",
  textTertiary: "#8C8C8C",
  border: "#E8E8E8",
  borderLight: "#F0F0F0",
  bg: "#FAFAFA",
  paper: "#FFFFFF",
  cream: "#FFF8F0",
  success: "#52C41A",
  warning: "#FAAD14",
  error: "#FF4D4F",
  info: "#1677FF",
};

export const antdThemeConfig: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: brandColors.red,
    colorInfo: brandColors.info,
    colorSuccess: brandColors.success,
    colorWarning: brandColors.warning,
    colorError: brandColors.error,
    colorTextBase: brandColors.textPrimary,
    colorBgBase: brandColors.paper,
    colorBgLayout: brandColors.bg,
    colorBorder: brandColors.border,
    colorBorderSecondary: brandColors.borderLight,
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,
    fontFamily:
      '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", sans-serif',
    fontSize: 14,
    controlHeight: 38,
    controlHeightLG: 44,
    boxShadow:
      "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
    boxShadowSecondary:
      "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
  },
  components: {
    Button: {
      controlHeight: 38,
      fontWeight: 500,
      borderRadius: 8,
      primaryShadow: "0 2px 0 rgba(185, 0, 0, 0.06)",
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 20,
    },
    Table: {
      borderRadius: 10,
      headerBg: "#FAFAFA",
      headerColor: brandColors.textSecondary,
      headerSplitColor: "transparent",
      rowHoverBg: "#FAFAFA",
    },
    Tabs: {
      titleFontSize: 14,
      horizontalItemPadding: "10px 0",
      horizontalItemGutter: 24,
    },
    Tag: {
      borderRadiusSM: 4,
      defaultBg: "#FAFAFA",
      defaultColor: brandColors.textSecondary,
    },
    Menu: {
      itemBorderRadius: 8,
      itemHeight: 38,
      itemSelectedBg: brandColors.redSoft,
      itemSelectedColor: brandColors.red,
      itemHoverBg: "#F5F5F5",
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Drawer: {
      paddingLG: 20,
    },
    Input: {
      controlHeight: 38,
      borderRadius: 8,
    },
    Select: {
      controlHeight: 38,
      borderRadius: 8,
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 26,
    },
  },
};
