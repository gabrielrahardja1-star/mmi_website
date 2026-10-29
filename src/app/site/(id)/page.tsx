import { sitePage } from "@/components/site/route-pages";
import { pageMetadata } from "@/lib/site-metadata";

export const generateMetadata = () => pageMetadata("home", "id");

export default sitePage("home", "id");
