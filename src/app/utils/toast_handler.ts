import {toaster} from "@/components/ui/toaster";

export interface ToastFactoryParams {
    message: string;
    type: "success" | "info" | "warning" | "error";
}

/**
 * Allows toasts to be created outside the app directory
 * @param message - The message to be displayed in the toast
 * @param type - The toast variation to use
 * @constructor
 */
export default function ToastFactory({message, type}: ToastFactoryParams) {
    switch (type) {
        case "success":
            toaster.success({description: message});
            break;
        case "warning":
            toaster.warning({description: message});
            break;
        case "error":
            toaster.error({description: message});
            break;
        case "info":
            toaster.info({description: message});
            break;
    }
}