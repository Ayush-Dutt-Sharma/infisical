import Head from "next/head";
import { GetServerSideProps } from 'next';
import { ViewSecretPublicPage } from "@app/views/ViewSecretPublicPage";
import {ViewMultiSecretPublicPage} from "@app/views/ViewMultiSecretPublicPage"
interface SecretSharedPublicPageProps {
  decodedSecretId: string;
  decodedKey: string;
  isMulti: boolean;
}

const SecretSharedPublicPage: React.FC<SecretSharedPublicPageProps> = ({ decodedSecretId, decodedKey, isMulti }) => {
  return (
    <>
      <Head>
        <title>Securely Share Secrets | Infisical</title>
        <link rel="icon" href="/infisical.ico" />
        <meta property="og:image" content="/images/message.png" />
        <meta property="og:title" content="" />
        <meta name="og:description" content="" />
      </Head>
      {isMulti ? <ViewMultiSecretPublicPage/> : null}
      <ViewSecretPublicPage/>
      
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { secretId, key, multi } = context.query;

  if (typeof secretId !== 'string' || typeof key !== 'string') {
    return {
      notFound: true,
    };
  }

  const decodedSecretId = decodeURIComponent(secretId);
  const decodedKey = decodeURIComponent(key);
  const isMulti = multi === 'true';

  return {
    props: {
      decodedSecretId,
      decodedKey,
      isMulti,
    },
  };
};

export default SecretSharedPublicPage;

SecretSharedPublicPage.requireAuth = false;