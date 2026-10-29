import {Field, HStack, Input, type InputProps} from "@chakra-ui/react";
import {Tooltip} from "@/shared/ui/tooltip";
import {LuInfo} from "react-icons/lu";

interface TextFieldProps extends InputProps {
    error?: boolean;
    errorText?: string;
    label?: string;
    tooltip?: string;
}

export default function TextField({
                                      error = false,
                                      errorText,
                                      label,
                                      tooltip,
                                      ...props
                                  }: TextFieldProps) {
    return (
        <Field.Root invalid={error}>
            {label && (
                <HStack gap={1}>
                    <Field.Label>{label}</Field.Label>
                    {tooltip && (
                        <Tooltip content={tooltip} showArrow>
                            <span tabIndex={0} role="img" aria-label={tooltip}
                                style={{display: "inline-flex", alignItems: "center", marginLeft: "4px", cursor: "help"}}>
                                <LuInfo size={13}/>
                            </span>
                        </Tooltip>
                    )}
                </HStack>
            )}
            <Input minH="44px" {...props}/>
            {tooltip && <Field.HelperText srOnly>{tooltip}</Field.HelperText>}
            <Field.ErrorText>{errorText}</Field.ErrorText>
        </Field.Root>
    );
}
