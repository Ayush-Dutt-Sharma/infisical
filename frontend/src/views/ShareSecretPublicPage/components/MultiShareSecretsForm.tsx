import crypto from "crypto";

import React,{ useState,useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { faCheck, faCopy, faRedo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createNotification } from "@app/components/notifications";
import { encryptSymmetric } from "@app/components/utilities/cryptography/crypto";
import { Button, FormControl, IconButton, Input, Select, SelectItem } from "@app/components/v2";
import { useTimedReset } from "@app/hooks";
import { useCreatePublicSharedSecret, useCreateSharedSecret } from "@app/hooks/api";
import { SecretSharingAccessType } from "@app/hooks/api/secretSharing";
import {SecretV3RawSanitized} from "@app/hooks/api/types";
// secrets in ms
const expiresInOptions = [
  { label: "5 min", value: 5 * 60 * 1000 },
  { label: "30 min", value: 30 * 60 * 1000 },
  { label: "1 hour", value: 60 * 60 * 1000 },
  { label: "1 day", value: 24 * 60 * 60 * 1000 },
  { label: "7 days", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "14 days", value: 14 * 24 * 60 * 60 * 1000 },
  { label: "30 days", value: 30 * 24 * 60 * 60 * 1000 }
];

const viewLimitOptions = [
  { label: "1", value: 1 },
  { label: "Unlimited", value: -1 }
];


const secretSchema = z.object({
    key: z.string(),
    value: z.string().min(1, "Secret is required")
  });
  
  const schema = z.object({
    secrets: z.array(secretSchema).min(1, "At least one secret is required"),
    expiresIn: z.string(),
    viewLimit: z.string(),
    accessType: z.nativeEnum(SecretSharingAccessType).optional()
  });

  const encodeSecrets = (secrets:SecretV3RawSanitized[]) => {
    try {
      return secrets.map(secret => {
        if (typeof secret.key !== 'string' || typeof secret.value !== 'string') {
          throw new Error('Both key and value must be strings');
        }
        const encodedKey = btoa(unescape(encodeURIComponent(secret.key))).replace(/=/g, '');
        const encodedValue = btoa(unescape(encodeURIComponent(secret.value))).replace(/=/g, '');
        return `${encodedKey}__${encodedValue}`;
      }).join('|||');
    } catch (error) {
      console.error('Error encoding secrets:', error);
      return '';
    }
  };

export type FormData = z.infer<typeof schema>;

type Props = {
  isPublic: boolean; // whether or not this is a public (non-authenticated) secret sharing form
  secrets?: SecretV3RawSanitized[] ;
};

export const MultiShareSecretsForm = ({ isPublic, secrets }: Props) => {
  const [secretLink, setSecretLink] = useState("");
  const [, isCopyingSecret, setCopyTextSecret] = useTimedReset<string>({
    initialState: "Copy to clipboard"
  });

  const publicSharedSecretCreator = useCreatePublicSharedSecret();
  const privateSharedSecretCreator = useCreateSharedSecret();
  const createSharedSecret = isPublic ? publicSharedSecretCreator : privateSharedSecretCreator;

  const {
    control,
    reset,
    handleSubmit,
    formState: { isSubmitting,errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      secrets: secrets || []
    }
  });


  const onFormSubmit = async ({ secrets, expiresIn, viewLimit, accessType }: FormData) => {
    console.log('ok')
    try {
      const expiresAt = new Date(new Date().getTime() + Number(expiresIn));

      const key = crypto.randomBytes(16).toString("hex");
      const hashedHex = crypto.createHash("sha256").update(key).digest("hex");
      const mainSecret = encodeSecrets(secrets)
      const { ciphertext, iv, tag } = encryptSymmetric({
        plaintext: mainSecret,
        key
      });

      const { id } = await createSharedSecret.mutateAsync({
        name:'',
        encryptedValue: ciphertext,
        hashedHex,
        iv,
        tag,
        expiresAt,
        expiresAfterViews: viewLimit === "-1" ? undefined : Number(viewLimit),
        accessType
      });
      console.log('id secret- - - ',id,ciphertext)
      setSecretLink(
        `${window.location.origin}/shared/secret/${id}?key=${encodeURIComponent(
          hashedHex
        )}-${encodeURIComponent(key)}&&multi=true`
      );
      reset();

      setCopyTextSecret("secret");
      createNotification({
        text: "Successfully created a shared secret",
        type: "success"
      });
    } catch (error) {
      console.error(error);
      createNotification({
        text: "Failed to create a shared secret",
        type: "error"
      });
    }
  };

  const hasSecretLink = Boolean(secretLink);
  const onInvalid = (errs:unknown)=> {
    createNotification({
      text: "Failed to create a shared secret",
      type: "error"
    });
    console.log('onInvalid',errs,errors)
  }
  return !hasSecretLink ? (
    <form onSubmit={handleSubmit(onFormSubmit,onInvalid)}>
     <table className="w-full border-collapse">
        <thead>
          <tr>
            {!isPublic && <th className="p-2 text-left">Name</th>}
            <th className="p-2 text-left">Your Secret</th>
          </tr>
        </thead>
        <tbody>
          {secrets?.map((field, index) => (
            <tr key={field?.id}>
              {!isPublic && (
                <td className="p-2">
                  <Controller
                    name={`secrets.${index}.key`}
                    control={control}
                    render={({ field }) => (
                      <FormControl
                        isError={Boolean(errors.secrets?.[index]?.key)}
                        errorText={errors.secrets?.[index]?.key?.message}
                      >
                        <Input
                          {...field}
                          placeholder="API Key"
                          type="text"
                          className = 'overflow-scroll'
                        />
                      </FormControl>
                    )}
                  />
                </td>
              )}
              <td className="p-2">
                <Controller
                  name={`secrets.${index}.value`}
                  control={control}
                  render={({ field }) => (
                    <FormControl
                      isError={Boolean(errors.secrets?.[index]?.value)}
                      errorText={errors.secrets?.[index]?.value?.message}
                      isRequired
                    >
                      <Input
                        {...field}
                        placeholder="Enter sensitive data to share..."
                        type="text"
                        className = 'overflow-scroll'
                        isReadOnly
                        isRequired
                      />
                    </FormControl>
                  )}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Controller
        control={control}
        name="expiresIn"
        defaultValue="3600000"
        render={({ field: { onChange, ...field }, fieldState: { error } }) => (
          <FormControl label="Expires In" errorText={error?.message} isError={Boolean(error)}>
            <Select
              defaultValue={field.value}
              {...field}
              onValueChange={(e) => onChange(e)}
              className="w-full"
            >
              {expiresInOptions.map(({ label, value: expiresInValue }) => (
                <SelectItem value={String(expiresInValue || "")} key={label}>
                  {label}
                </SelectItem>
              ))}
            </Select>
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="viewLimit"
        defaultValue="-1"
        render={({ field: { onChange, ...field }, fieldState: { error } }) => (
          <FormControl label="Max Views" errorText={error?.message} isError={Boolean(error)}>
            <Select
              defaultValue={field.value}
              {...field}
              onValueChange={(e) => onChange(e)}
              className="w-full"
            >
              {viewLimitOptions.map(({ label, value: viewLimitValue }) => (
                <SelectItem value={String(viewLimitValue || "")} key={label}>
                  {label}
                </SelectItem>
              ))}
            </Select>
          </FormControl>
        )}
      />
      {!isPublic && (
        <Controller
          control={control}
          name="accessType"
          defaultValue={SecretSharingAccessType.Organization}
          render={({ field: { onChange, ...field }, fieldState: { error } }) => (
            <FormControl label="General Access" errorText={error?.message} isError={Boolean(error)}>
              <Select
                defaultValue={field.value}
                {...field}
                onValueChange={(e) => onChange(e)}
                className="w-full"
              >
                <SelectItem value={SecretSharingAccessType.Anyone}>Anyone</SelectItem>
                <SelectItem value={SecretSharingAccessType.Organization}>
                  People within your organization
                </SelectItem>
              </Select>
            </FormControl>
          )}
        />
      )}
      <Button
        className="mt-4"
        size="sm"
        type="submit"
        isLoading={isSubmitting}
        isDisabled={isSubmitting}
      >
        Create secret link
      </Button>
    </form>
  ) : (
    <>
      <div className="mr-2 flex items-center justify-end rounded-md bg-white/[0.05] p-2 text-base text-gray-400">
        <p className="mr-4 break-all">{secretLink}</p>
        <IconButton
          ariaLabel="copy icon"
          colorSchema="secondary"
          className="group relative ml-2"
          onClick={() => {
            navigator.clipboard.writeText(secretLink);
            setCopyTextSecret("Copied");
          }}
        >
          <FontAwesomeIcon icon={isCopyingSecret ? faCheck : faCopy} />
        </IconButton>
      </div>
      <Button
        className="mt-4 w-full bg-mineshaft-700 py-3 text-bunker-200"
        colorSchema="primary"
        variant="outline_bg"
        size="sm"
        onClick={() => setSecretLink("")}
        rightIcon={<FontAwesomeIcon icon={faRedo} className="pl-2" />}
      >
        Share another secret
      </Button>
    </>
  );
};

  