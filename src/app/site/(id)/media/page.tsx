import { sitePage } from "@/components/site/route-pages";
import { pageMetadata } from "@/lib/site-metadata";

export const generateMetadata = () => pageMetadata("media", "id");

export default sitePage("media", "id");
