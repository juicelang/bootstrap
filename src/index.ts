import args from "@/args";
import log from "@/log";

try {
} catch (error) {
  if (error instanceof Error) {
    log.error("Failed to run main.");

    console.log(error);
  } else {
    log.error("Unknown error:");
    log.error({ error });
  }
}
