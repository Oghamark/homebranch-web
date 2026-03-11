import {Field, Input, type InputProps} from "@chakra-ui/react";
import {Tooltip} from "@/components/ui/tooltip";
import {LuInfo} from "react-icons/lu";

interface TextFieldProps extends InputProps {
    error?: boolean;
    errorText?: string;
    label: string;
    tooltip?: string;
}

export default function PasswordTextField({
                                              error = false,
                                              errorText,
                                              label,
                                              tooltip,
                                              ...props
                                          }: TextFieldProps) {
    return (
        <Field.Root invalid={error}>
            <Field.Label>
                {label}
                {tooltip && (
                    <Tooltip content={tooltip} showArrow>
                        <span style={{display: "inline-flex", alignItems: "center", marginLeft: "4px", cursor: "default"}}>
                            <LuInfo size={13}/>
                        </span>
                    </Tooltip>
                )}
            </Field.Label>
            <Input type="password" {...props}/>
            <Field.ErrorText>{errorText}</Field.ErrorText>
        </Field.Root>
    );
}
