"use client";

import { toast } from "sonner";
import { Button } from "./button";

type Props = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export function ConfirmModal({ open, title, message, onConfirm, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-soft">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              try {
                await onConfirm();
              } catch (error: any) {
                toast.error(error.message ?? "Erro ao confirmar");
              }
            }}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}
