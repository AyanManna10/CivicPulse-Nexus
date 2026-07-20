import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1A3A8F", dark: "#0F2557", light: "#2454CC" },
    secondary: { main: "#00897B", light: "#26A69A" },
    background: { default: "#F0F2F8", paper: "#FFFFFF" },
    warning: { main: "#E65100" },
    error: { main: "#C62828" },
    success: { main: "#2E7D32" },
    info: { main: "#1565C0" },
    text: { primary: "#1A1F36", secondary: "#5A6072" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h4: { fontWeight: 700, letterSpacing: -0.5 },
    h5: { fontWeight: 700, letterSpacing: -0.3 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0.2 },
    caption: { fontSize: "0.75rem", letterSpacing: 0.3 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
          borderRadius: 10,
        },
      },
    },
    MuiButton: {
  styleOverrides: {
    root: { borderRadius: 6, padding: "7px 18px" },
  },
  defaultProps: {
    disableElevation: false,
  },
},

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6, fontSize: "0.72rem" },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: "0 1px 0 rgba(0,0,0,0.1)" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, minHeight: 44 },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, fontSize: "0.78rem", letterSpacing: 0.5, textTransform: "uppercase", color: "#5A6072", backgroundColor: "#F8F9FC" },
      },
    },
    MuiButtonBase: {
  styleOverrides: {
    root: {
      "&.MuiButton-containedPrimary": {
        background: "linear-gradient(135deg, #1A3A8F 0%, #2454CC 100%)",
        "&:hover": { background: "linear-gradient(135deg, #0F2557 0%, #1A3A8F 100%)" },
      },
    },
  },
},
},
});