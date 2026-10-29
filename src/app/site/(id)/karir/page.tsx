import { sitePage } from "@/components/site/route-pages";
import { pageMetadata } from "@/lib/site-metadata";

export const generateMetadata = () => pageMetadata("careers", "id");

export default sitePage("careers", "id");
