"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiWebStack = void 0;
const path = __importStar(require("path"));
const aws_cdk_lib_1 = require("aws-cdk-lib");
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const apigwv2 = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
class AiWebStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const chatFn = new aws_lambda_nodejs_1.NodejsFunction(this, 'ChatHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '..', 'src', 'lambda', 'chat.ts'),
            handler: 'handler',
            memorySize: 512,
            timeout: aws_cdk_lib_1.Duration.seconds(20),
            bundling: { minify: true, externalModules: [], target: 'node20' },
            environment: { OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '' }
        });
        const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
            corsPreflight: {
                allowHeaders: ['content-type', 'authorization'],
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
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
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
        new aws_cdk_lib_1.CfnOutput(this, 'ApiBaseUrl', { value: httpApi.apiEndpoint });
        new aws_cdk_lib_1.CfnOutput(this, 'CloudFrontUrl', { value: 'https://' + dist.distributionDomainName });
    }
}
exports.AiWebStack = AiWebStack;
