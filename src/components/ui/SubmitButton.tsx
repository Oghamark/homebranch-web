import {Button, type ButtonProps, Loader} from "@chakra-ui/react";

interface SubmitButtonProps extends ButtonProps {
    pending?: boolean;
    success?: boolean;
    error?: boolean;
}

export default function SubmitButton({pending, success, error, children, ...props}: SubmitButtonProps) {
    return (
        <Button disabled={pending || props.disabled} {...props}>
            {pending ? <Loader/> : children}
        </Button>
    );
}