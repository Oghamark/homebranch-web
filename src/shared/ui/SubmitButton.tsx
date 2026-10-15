import {Button, type ButtonProps} from "@chakra-ui/react";

interface SubmitButtonProps extends ButtonProps {
    pending?: boolean;
    success?: boolean;
    error?: boolean;
}

export default function SubmitButton({pending, success, error, children, ...props}: SubmitButtonProps) {
    return (
        <Button {...props} minH={props.minH ?? "44px"} loading={pending || props.loading}
            loadingText={props.loadingText ?? children} aria-busy={pending || props.loading || undefined} disabled={pending || props.disabled}>
            {children}
        </Button>
    );
}
