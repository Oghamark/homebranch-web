import {toaster} from "@/shared/ui/toaster";

export interface ToastFactoryParams {
    message: string;
    type: "success" | "info" | "warning" | "error";
}

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
