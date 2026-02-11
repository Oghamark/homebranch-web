import {Field, Input, type InputProps} from "@chakra-ui/react";

interface TextFieldProps extends InputProps {
    error?: boolean;
    errorText?: string;
    label?: string;
}

export default function TextField({
                                      error = false,
                                      errorText,
                                      label,
                                      ...props
                                  }: TextFieldProps) {
    return (
        <Field.Root invalid={error}>
            {label && <Field.Label>{label}</Field.Label>}
            <Input {...props}/>
            <Field.ErrorText>{errorText}</Field.ErrorText>
        </Field.Root>
    );
}
