import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import { Snackbar, Alert, type AlertColor } from "@mui/material";

interface NotificationContextType {
  showNotification: (message: string, severity?: AlertColor) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertColor>("info");

  const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  const showNotification = useCallback(
    (msg: string, sev: AlertColor = "info") => {
      setMessage(msg);
      setSeverity(sev);
      setOpen(true);
    },
    [],
  );

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
};
