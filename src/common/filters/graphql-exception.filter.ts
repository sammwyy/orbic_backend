import { ArgumentsHost, Catch } from "@nestjs/common";
import { GqlArgumentsHost, GqlExceptionFilter } from "@nestjs/graphql";

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);

    return {
      message: exception.message || "Internal server error",
      code: exception.code || "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    };
  }
}
