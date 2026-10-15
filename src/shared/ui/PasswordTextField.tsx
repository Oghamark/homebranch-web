import {Box, Field, HStack, IconButton, Input, type InputProps} from "@chakra-ui/react";
import {Tooltip} from "@/shared/ui/tooltip";
import {LuEye, LuEyeOff, LuInfo} from "react-icons/lu";
import {useState} from "react";

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
    const [visible, setVisible] = useState(false);
    return (
        <Field.Root invalid={error}>
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
            <Box position="relative" w="full">
                <Input minH="44px" pe={12} {...props} type={visible ? "text" : "password"}/>
                <IconButton type="button" position="absolute" insetEnd={0} top={0} minW="44px" minH="44px" variant="ghost"
                    disabled={props.disabled} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
                    aria-pressed={visible} onClick={() => setVisible(current => !current)}>
                    {visible ? <LuEyeOff/> : <LuEye/>}
                </IconButton>
            </Box>
            {tooltip && <Field.HelperText srOnly>{tooltip}</Field.HelperText>}
            <Field.ErrorText>{errorText}</Field.ErrorText>
        </Field.Root>
    );
}
