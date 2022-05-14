import core from "@actions/core";
import aws from "aws-sdk";
import mime from "mime-types";

const run = async () => {
  const artifact = core.getInput("artifact", { required: true });
  const awsAccessKeyId = core.getInput("aws-access-key-id", { required: true });
  const awsSecretAccessKey = core.getInput("aws-secret-access-key", {
    required: true,
  });
  const cacheControl = core.getInput("cache-control");
  const isPublic = core.getBooleanInput("public");
  const s3BucketName = core.getInput("s3-bucket-name", { required: true });
  const s3ObjectKey = core.getInput("s3-object-key", { required: true });

  const s3 = new aws.S3({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  });

  await s3
    .putObject({
      ACL: isPublic ? "public-read" : undefined,
      Body: artifact,
      Bucket: s3BucketName,
      CacheControl: cacheControl,
      ContentType: mime.lookup(s3ObjectKey),
      Key: s3ObjectKey,
    })
    .promise()
    .then(() => {
      core.info(`Artifact saved using key ${s3ObjectKey}`);
      core.setOutput("success", "true");
    })
    .catch(
      /**
       * @param {aws.AWSError | NodeJS.ErrnoException} error
       */
      (error) => {
        core.setOutput("success", "false");
        throw error;
      }
    );
};

run();
