import type {Route} from "./+types/settings";
import {
    Badge,
    Button,
    Card,
    Flex,
    Heading,
    Loader,
    Separator,
    Stack,
    Switch,
    Text,
} from "@chakra-ui/react";
import {useState, useEffect} from "react";
import {useGetUserByIdQuery} from "@/entities/user";
import {useGetAuthConfigQuery, useUpdateAuthConfigMutation} from "@/entities/authConfig";
import {LuKeyRound, LuMail, LuSettings, LuShieldCheck, LuUser, LuUserPlus} from "react-icons/lu";
import {handleRtkError} from "@/shared/api/rtk-query";
import TextField from "@/shared/ui/TextField";
import PasswordTextField from "@/shared/ui/PasswordTextField";
import ToastFactory from "@/shared/lib/toast/toast";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Homebranch - Settings"},
    ];
}

export default function Settings() {
    const userId = sessionStorage.getItem("user_id");
    const userRole = sessionStorage.getItem("user_role") ?? "USER";
    const isAdmin = userRole === "ADMIN";
    const {data: user, isLoading} = useGetUserByIdQuery(userId ?? "", {
        skip: !userId,
    });
    const {data: authConfig} = useGetAuthConfigQuery(undefined, {skip: !isAdmin});
    const [updateAuthConfig] = useUpdateAuthConfigMutation();

    const [oidcForm, setOidcForm] = useState({
        oidcEnabled: false,
        oidcProviderName: "",
        oidcIssuerUrl: "",
        oidcClientId: "",
        oidcClientSecret: "",
        oidcCallbackUrl: "",
    });

    const [ldapForm, setLdapForm] = useState({
        ldapEnabled: false,
        ldapServerUrl: "",
        ldapBindDn: "",
        ldapBindPassword: "",
        ldapBaseDn: "",
        ldapAdminGroup: "",
        ldapUserGroup: "",
        ldapEmailField: "",
        ldapNameField: "",
    });

    const [isSavingOidc, setIsSavingOidc] = useState(false);

    const [isSavingLdap, setIsSavingLdap] = useState(false);

    useEffect(() => {
        if (authConfig) {
            setOidcForm({
                oidcEnabled: authConfig.oidcEnabled,
                oidcProviderName: authConfig.oidcProviderName ?? "",
                oidcIssuerUrl: authConfig.oidcIssuerUrl ?? "",
                oidcClientId: authConfig.oidcClientId ?? "",
                oidcClientSecret: authConfig.oidcClientSecret ?? "",
                oidcCallbackUrl: authConfig.oidcCallbackUrl ?? "",
            });

            setLdapForm({
                ldapEnabled: authConfig.ldapEnabled,
                ldapServerUrl: authConfig.ldapServerUrl ?? "",
                ldapAdminGroup: authConfig.ldapAdminGroup ?? "",
                ldapUserGroup: authConfig.ldapUserGroup ?? "",
                ldapBaseDn: authConfig.ldapBaseDn ?? "",
                ldapBindDn: authConfig.ldapBindDn ?? "",
                ldapBindPassword: authConfig.ldapBindPassword ?? "",
                ldapEmailField: authConfig.ldapEmailField ?? "",
                ldapNameField: authConfig.ldapNameField ?? "",
            })
        }
    }, [authConfig]);

    const handleSaveOidc = async () => {
        setIsSavingOidc(true);
        try {
            await updateAuthConfig({
                oidcEnabled: oidcForm.oidcEnabled,
                oidcProviderName: oidcForm.oidcProviderName || null,
                oidcIssuerUrl: oidcForm.oidcIssuerUrl || null,
                oidcClientId: oidcForm.oidcClientId || null,
                oidcClientSecret: oidcForm.oidcClientSecret || null,
                oidcCallbackUrl: oidcForm.oidcCallbackUrl || null,
            }).unwrap();
            ToastFactory({message: "OIDC settings saved successfully", type: "success"});
        } catch (error) {
            handleRtkError(error);
        } finally {
            setIsSavingOidc(false);
        }
    };

    const handleSaveLdap = async () => {
        setIsSavingLdap(true);

        try {
            await updateAuthConfig({
                ldapEnabled: ldapForm.ldapEnabled,
                ldapServerUrl: ldapForm.ldapServerUrl || null,
                ldapAdminGroup: ldapForm.ldapAdminGroup || null,
                ldapUserGroup: ldapForm.ldapUserGroup || null,
                ldapBaseDn: ldapForm.ldapBaseDn || null,
                ldapBindDn: ldapForm.ldapBindDn || null,
                ldapBindPassword: ldapForm.ldapBindPassword || null,
                ldapEmailField: ldapForm.ldapEmailField || null,
                ldapNameField: ldapForm.ldapNameField || null,
            }).unwrap();
            ToastFactory({message: "LDAP settings saved successfully", type: "success"});
        } catch (error) {
            handleRtkError(error);
        } finally {
            setIsSavingLdap(false);
        }

    }

    if (isLoading) {
        return (
            <Flex justify="center" align="center" minH="200px">
                <Loader/>
            </Flex>
        );
    }

    return (
        <Stack gap={4}>
            <Flex align="center" gap={3} display={{base: "none", md: "flex"}}>
                <LuSettings size={24}/>
                <Heading size="2xl">Account Settings</Heading>
            </Flex>

            <Card.Root>
                <Card.Header>
                    <Card.Title>Profile</Card.Title>
                </Card.Header>
                <Card.Body>
                    {user ? (
                        <Stack gap={4}>
                            <Flex align="center" gap={3}>
                                <LuUser/>
                                <Stack gap={0}>
                                    <Text fontWeight="medium">{user.name}</Text>
                                    <Text fontSize="sm" color="fg.muted">Name</Text>
                                </Stack>
                            </Flex>
                            <Separator/>
                            <Flex align="center" gap={3}>
                                <LuMail/>
                                <Stack gap={0}>
                                    <Text fontWeight="medium">{user.email}</Text>
                                    <Text fontSize="sm" color="fg.muted">Email</Text>
                                </Stack>
                            </Flex>
                            <Separator/>
                            <Flex align="center" gap={3}>
                                <LuShieldCheck/>
                                <Stack gap={0}>
                                    <Badge
                                        variant="subtle"
                                        colorPalette={userRole === "ADMIN" ? "blue" : "gray"}
                                    >
                                        {userRole}
                                    </Badge>
                                    <Text fontSize="sm" color="fg.muted" mt={1}>Role</Text>
                                </Stack>
                            </Flex>
                        </Stack>
                    ) : (
                        <Text color="fg.muted">Unable to load profile information</Text>
                    )}
                </Card.Body>
            </Card.Root>

            {isAdmin && (
                <Card.Root>
                    <Card.Header>
                        <Card.Title>Authentication Settings</Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <Flex align="center" gap={3} justify="space-between">
                            <Flex align="center" gap={3}>
                                <LuUserPlus/>
                                <Stack gap={0}>
                                    <Text fontWeight="medium">Allow Sign Up</Text>
                                    <Text fontSize="sm" color="fg.muted">
                                        {authConfig?.signupEnabled ? "New users can self-register" : "Registration is disabled"}
                                    </Text>
                                </Stack>
                            </Flex>
                            <Switch.Root
                                checked={authConfig?.signupEnabled ?? false}
                                onCheckedChange={async ({checked}) => {
                                    try {
                                        await updateAuthConfig({signupEnabled: checked}).unwrap();
                                    } catch (error) {
                                        handleRtkError(error);
                                    }
                                }}
                            >
                                <Switch.HiddenInput/>
                                <Switch.Control>
                                    <Switch.Thumb/>
                                </Switch.Control>
                            </Switch.Root>
                        </Flex>
                    </Card.Body>
                </Card.Root>
            )}

            {isAdmin && (
                <Card.Root>
                    <Card.Header>
                        <Flex align="center" gap={3}>
                            <LuKeyRound/>
                            <Card.Title>Single Sign-On (OIDC)</Card.Title>
                        </Flex>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap={4}>
                            <Flex align="center" gap={3} justify="space-between">
                                <Stack gap={0}>
                                    <Text fontWeight="medium">Enable OIDC</Text>
                                    <Text fontSize="sm" color="fg.muted">
                                        {oidcForm.oidcEnabled ? "Users can sign in via your identity provider" : "OIDC login is disabled"}
                                    </Text>
                                </Stack>
                                <Switch.Root
                                    checked={oidcForm.oidcEnabled}
                                    onCheckedChange={({checked}) =>
                                        setOidcForm(prev => ({...prev, oidcEnabled: checked}))
                                    }
                                >
                                    <Switch.HiddenInput/>
                                    <Switch.Control>
                                        <Switch.Thumb/>
                                    </Switch.Control>
                                </Switch.Root>
                            </Flex>
                            <Separator/>
                            <TextField
                                label="Provider Name"
                                tooltip="A display name for your identity provider, shown on the login page."
                                placeholder="e.g. Keycloak, Google, Okta"
                                value={oidcForm.oidcProviderName}
                                onChange={e => setOidcForm(prev => ({...prev, oidcProviderName: e.target.value}))}
                            />
                            <TextField
                                label="Issuer URL"
                                tooltip="The base URL of your OIDC provider's discovery endpoint (e.g. the realm or tenant URL)."
                                placeholder="https://your-provider.example.com/realms/myrealm"
                                value={oidcForm.oidcIssuerUrl}
                                onChange={e => setOidcForm(prev => ({...prev, oidcIssuerUrl: e.target.value}))}
                            />
                            <TextField
                                label="Client ID"
                                tooltip="The client identifier registered with your identity provider for this application."
                                placeholder="your-client-id"
                                value={oidcForm.oidcClientId}
                                onChange={e => setOidcForm(prev => ({...prev, oidcClientId: e.target.value}))}
                            />
                            <PasswordTextField
                                label="Client Secret"
                                tooltip="The secret key paired with the Client ID. Keep this confidential."
                                placeholder="your-client-secret"
                                value={oidcForm.oidcClientSecret}
                                onChange={e => setOidcForm(prev => ({...prev, oidcClientSecret: e.target.value}))}
                            />
                            <TextField
                                label="Callback URL"
                                tooltip="Must be your frontend host + /auth/login/oidc/callback (e.g. https://homebranch.example.com/auth/login/oidc/callback). Register this exact URL with your identity provider."
                                placeholder="https://your-app.example.com/auth/login/oidc/callback"
                                value={oidcForm.oidcCallbackUrl}
                                onChange={e => setOidcForm(prev => ({...prev, oidcCallbackUrl: e.target.value}))}
                            />
                        </Stack>
                    </Card.Body>
                    <Card.Footer justifyContent="flex-end">
                        <Button
                            onClick={handleSaveOidc}
                            loading={isSavingOidc}
                        >
                            Save OIDC Settings
                        </Button>
                    </Card.Footer>
                </Card.Root>
            )}

            {isAdmin && (
                <Card.Root>
                    <Card.Header>
                        <Flex align="center" gap={3}>
                            <LuKeyRound/>
                            <Card.Title>Lightweight Directory Access Protocl (LDAP)</Card.Title>
                        </Flex>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap={4}>
                            <Flex align="center" gap={3} justify="space-between">
                                <Stack gap={0}>
                                    <Text fontWeight="medium">Enable LDAP</Text>
                                    <Text fontSize="sm" color="fg.muted">
                                        {ldapForm.ldapEnabled ? "Users can sign in via your identity provider" : "LDAP login is disabled"}
                                    </Text>
                                </Stack>
                                <Switch.Root
                                    checked={ldapForm.ldapEnabled}
                                    onCheckedChange={({checked}) =>
                                        setLdapForm(prev => ({...prev, ldapEnabled: checked}))
                                    }
                                >
                                    <Switch.HiddenInput/>
                                    <Switch.Control>
                                        <Switch.Thumb/>
                                    </Switch.Control>
                                </Switch.Root>
                            </Flex>
                            <Separator/>
                            <TextField
                                label="Server URL"
                                tooltip="Server URL and port for the LDAP server. Must be reachable by your Authentication API server"
                                placeholder="e.g. ldap://auth-server:389"
                                value={ldapForm.ldapServerUrl}
                                onChange={e => setLdapForm(prev => ({...prev, ldapServerUrl: e.target.value}))}
                            />
                            <TextField
                                label="Bind DN"
                                tooltip="The service or admin user that should be used to bind for user searches"
                                placeholder="cn=service_user,dc=example,dc=com"
                                value={ldapForm.ldapBindDn}
                                onChange={e => setLdapForm(prev => ({...prev, ldapBindDn: e.target.value}))}
                            />
                            <PasswordTextField
                                label="Bind Password"
                                tooltip="The password (if required) for the bind user"
                                placeholder=""
                                value={ldapForm.ldapBindPassword }
                                onChange={e => setLdapForm(prev => ({...prev, ldapBindPassword: e.target.value}))}
                            />
                            <TextField
                                label="Admins Group"
                                tooltip="Members of this group at the time of their first login will be homebranch admins"
                                placeholder="ou=homebranch-admins,dc=example,dc=com"
                                value={ldapForm.ldapAdminGroup}
                                onChange={e => setLdapForm(prev => ({...prev, ldapAdminGroup: e.target.value}))}
                            />
                            <TextField
                                label="Users Group"
                                tooltip="Users must be a member of this group to login"
                                placeholder="ou=homebranch-users,dc=example,dc=com"
                                value={ldapForm.ldapUserGroup}
                                onChange={e => setLdapForm(prev => ({...prev, ldapUserGroup: e.target.value}))}
                            />
                            <TextField
                                label="Email Field"
                                tooltip="AD field holding the user's email address"
                                placeholder="mail"
                                value={ldapForm.ldapEmailField}
                                onChange={e => setLdapForm(prev => ({...prev, ldapEmailField: e.target.value}))}
                            />
                            <TextField
                                label="Name Field"
                                tooltip="AD field holding the user's name"
                                placeholder="sn"
                                value={ldapForm.ldapNameField}
                                onChange={e => setLdapForm(prev => ({...prev, ldapNameField: e.target.value}))}
                            />
                        </Stack>
                    </Card.Body>
                    <Card.Footer justifyContent="flex-end">
                        <Button
                            onClick={handleSaveLdap}
                            loading={isSavingLdap}
                        >
                            Save LDAP Settings
                        </Button>
                    </Card.Footer>
                </Card.Root>
            )}
        </Stack>
    );
}
