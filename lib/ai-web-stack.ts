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


export class AiWebStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

               // Importar los secrets existentes
           const openaiSecret = secretsmanager.Secret.fromSecretNameV2(this, 'OpenAISecret', 'openai-api-key');
           const weatherSecret = secretsmanager.Secret.fromSecretNameV2(this, 'WeatherSecret', 'weather-api-key');

    // Bucket para documentos del dataset
    const documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const chatFn = new NodejsFunction(this, 'ChatHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '..', 'src', 'lambda', 'chat.ts'),
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.seconds(30),
      bundling: { minify: true, externalModules: [], target: 'node20' },
      environment: { 
        OPENAI_SECRET_NAME: openaiSecret.secretName,
        DOCUMENTS_BUCKET: documentsBucket.bucketName
      },
    });

               // Dar permisos a la Lambda
           openaiSecret.grantRead(chatFn);
           weatherSecret.grantRead(chatFn);
           documentsBucket.grantRead(chatFn);

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
  }
}
