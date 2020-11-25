# Fargate Syslog Aggregator Sample

rsyslog(UDP) -> NLB -> fluent-bit on Fargate -> S3

### fluent-bit on Fargate

```
$ npm run cdk deploy -- log-aggregator
```

## rsyslog

```
$ npm run cdk deploy -- log-publisher -c keypair=<YOUR KEY PAIR>
```

## Confirm logs

```
$ ssh ec2-user@<publisher ip>
$ NLB_IP=`dig +short <NLB_DNS>`
$ logger -i -d -t "sample" -n $NLB IP "hello,world"
```
