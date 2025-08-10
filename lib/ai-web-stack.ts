import * as path from 'path';
import { Stack, StackProps, RemovalPolicy, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class AiWebStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Importar los secrets existentes
    const openaiSecret = secretsmanager.Secret.fromSecretNameV2(this, 'OpenAISecret', 'openai-api-key');
    const weatherSecret = secretsmanager.Secret.fromSecretNameV2(this, 'WeatherSecret', 'weather-api-key');

    // VPC para OpenSearch
    const vpc = new ec2.Vpc(this, 'RAGVPC', {
      maxAzs: 1,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Security Group para OpenSearch
    const opensearchSecurityGroup = new ec2.SecurityGroup(this, 'OpenSearchSecurityGroup', {
      vpc,
      description: 'Security group for OpenSearch domain',
      allowAllOutbound: true,
    });

    // Permitir acceso desde las Lambdas
    opensearchSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      'Allow HTTPS from VPC'
    );

    // OpenSearch Domain
    const opensearchDomain = new opensearch.Domain(this, 'RAGDomain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_11,
      vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      capacity: {
        dataNodes: 1,
        dataNodeInstanceType: 't3.small.search',
      },
      ebs: {
        volumeSize: 10,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
      },
      enforceHttps: true,
      securityGroups: [opensearchSecurityGroup],
      accessPolicies: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.AnyPrincipal()],
          actions: ['es:*'],
          resources: ['*'],
        }),
      ],
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Bucket para documentos del dataset
    const documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Lambda para procesar documentos (crear embeddings)
    const documentProcessorFn = new NodejsFunction(this, 'DocumentProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '..', 'src', 'lambda', 'document-processor.ts'),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.seconds(60),
      bundling: { minify: true, externalModules: [], target: 'node20' },
      environment: { 
        OPENAI_SECRET_NAME: openaiSecret.secretName,
        OPENSEARCH_ENDPOINT: opensearchDomain.domainEndpoint,
        OPENSEARCH_INDEX: 'documents'
      },
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Lambda para upload directo de archivos
    const fileUploadFn = new NodejsFunction(this, 'FileUpload', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '..', 'src', 'lambda', 'file-upload.ts'),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.seconds(60),
      bundling: { minify: true, externalModules: [], target: 'node20' },
      environment: { 
        OPENAI_SECRET_NAME: openaiSecret.secretName,
        DOCUMENTS_BUCKET: documentsBucket.bucketName,
        OPENSEARCH_ENDPOINT: opensearchDomain.domainEndpoint,
        OPENSEARCH_INDEX: 'documents'
      },
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Lambda para chat (con búsqueda vectorial)
    const chatFn = new NodejsFunction(this, 'ChatHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '..', 'src', 'lambda', 'chat.ts'),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.seconds(30),
      bundling: { minify: true, externalModules: [], target: 'node20' },
      environment: { 
        OPENAI_SECRET_NAME: openaiSecret.secretName,
        DOCUMENTS_BUCKET: documentsBucket.bucketName,
        OPENSEARCH_ENDPOINT: opensearchDomain.domainEndpoint,
        OPENSEARCH_INDEX: 'documents'
      },
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Dar permisos a las Lambdas
    openaiSecret.grantRead(chatFn);
    openaiSecret.grantRead(documentProcessorFn);
    openaiSecret.grantRead(fileUploadFn);
    weatherSecret.grantRead(chatFn);
    documentsBucket.grantRead(chatFn);
    documentsBucket.grantReadWrite(documentProcessorFn);
    documentsBucket.grantReadWrite(fileUploadFn);
    opensearchDomain.grantReadWrite(chatFn);
    opensearchDomain.grantReadWrite(documentProcessorFn);
    opensearchDomain.grantReadWrite(fileUploadFn);

    // Configurar trigger S3 para procesar documentos automáticamente
    documentsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(documentProcessorFn),
      { prefix: 'documents/' }
    );

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      corsPreflight: {
        allowHeaders: ['content-type','authorization'],
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
        allowOrigins: ['*']
      }
    });

    httpApi.addRoutes({
      path: '/chat',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('ChatIntegration', chatFn)
    });

    httpApi.addRoutes({
      path: '/upload',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.OPTIONS],
      integration: new integrations.HttpLambdaIntegration('FileUploadIntegration', fileUploadFn)
    });

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const dist = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
      },
      defaultRootObject: 'index.html',
    });

    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      destinationBucket: siteBucket,
      distribution: dist,
      distributionPaths: ['/*'],
      sources: [s3deploy.Source.asset(path.join(__dirname, '..', 'frontend', 'dist'))],
      prune: true
    });

    new CfnOutput(this, 'ApiBaseUrl', { value: httpApi.apiEndpoint });
    new CfnOutput(this, 'CloudFrontUrl', { value: 'https://' + dist.distributionDomainName });
    new CfnOutput(this, 'OpenAISecretName', { value: openaiSecret.secretName });
    new CfnOutput(this, 'DocumentsBucketName', { value: documentsBucket.bucketName });
    new CfnOutput(this, 'OpenSearchEndpoint', { value: opensearchDomain.domainEndpoint });
    new CfnOutput(this, 'OpenSearchIndex', { value: 'documents' });
  }
}
