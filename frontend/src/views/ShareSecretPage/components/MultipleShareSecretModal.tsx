import { Modal, ModalContent } from "@app/components/v2";
import { UsePopUpState } from "@app/hooks/usePopUp";
import { MultiShareSecretsForm } from "@app/views/ShareSecretPublicPage/components";
import {SecretV3RawSanitized} from "@app/hooks/api/types";
type Props = {
  popUp: UsePopUpState<["shareMultiSecrets"]>;
  handlePopUpToggle: (
    popUpName: keyof UsePopUpState<["shareMultiSecrets"]>,
    state?: boolean
  ) => void;
  onShareSecretsClick : ()=>SecretV3RawSanitized[] | undefined
};

export const MultipleShareSecretModal = ({ popUp, handlePopUpToggle, onShareSecretsClick }: Props) => {
  const selectedSecrets = onShareSecretsClick()
  return (
    <Modal
      isOpen={popUp?.shareMultiSecrets?.isOpen}
      onOpenChange={(isOpen) => {
        handlePopUpToggle("shareMultiSecrets", isOpen);
      }}
    >
      <ModalContent
        title="Share Secrets"
        subTitle="Once you share a secret, the share link is only accessible once."
      >
        <MultiShareSecretsForm
          isPublic={false}
          secrets={selectedSecrets}
        />
      </ModalContent>
    </Modal>
  );
};
