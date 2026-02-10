import {
  useState,
  useContext,
  createContext,
  useCallback,
  type ReactNode,
} from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

type ConfirmFunction = (options: ConfirmOptions) => void;

const ConfirmDialogContext = createContext<ConfirmFunction>(() => {
  throw new Error("useConfirm must be used within a ConfirmDialogProvider");
});

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => {
  return useContext(ConfirmDialogContext);
};

export const ConfirmDialogProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((newOptions: ConfirmOptions) => {
    setOptions(newOptions);
  }, []);

  const handleClose = () => setOptions(null);

  const handleConfirm = () => {
    options?.onConfirm();
    handleClose();
  };

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(options)} onClose={handleClose} maxWidth="xs">
        {options && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AlertTriangle color="orange" />
              {options.title}
            </DialogTitle>
            <DialogContent>
              <DialogContentText component="div">
                {options.description}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>
                {options.cancelText || "取消"}
              </Button>
              <Button
                onClick={handleConfirm}
                color="primary"
                variant="contained"
                autoFocus
              >
                {options.confirmText || "確定"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
};
