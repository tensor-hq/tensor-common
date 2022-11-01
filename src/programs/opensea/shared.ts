import axios from 'axios';
import BN from 'bn.js';

const OS_ASSET_CONTRACT_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const OS_BASE_PATH = 'https://api.opensea.io';

export type OSReceivedOrderData = {
  client_message: string;
  client_signature_standard: string;
  order_data: string;
  server_signature: string;
};

// Only include some fields. Full response (as of 2022/08/13):
//
//  {
//           "created_date": "2022-08-13T23:42:51.437350",
//           "closing_date": "2022-08-20T23:42:50",
//           "listing_time": 1660434170,
//           "expiration_time": 1661038970,
//           "order_hash": "0200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200070d298d7388b687b54186492ba0bb0ac1a3e32ecfb489d64320106a5bc242f0280e1b0c166eb2ef4ef0dbff195ebf4c6bc3d90512d98a8b50be3302c3146f7408476761663d17c215603d1c7b2b84690c494d09542800be96d69e2aa96f62ac315849c5e99524f07898034804274203258b3165710477bd5762d3d2d93ad0a4c3bf7148e73420afa3cdd6cf5f2f54fcc6b7223cc19452d47eeecbdf4d4a60628373af07d1ee9181fd19ef835ab98f58ba70e401626aede849e79d06f4eff8880da013ec37c61ecc94ec013a4282343d8f35c73fe85def65387aa1d2f96fbdc3fe9a2989d6a9ff6b2a168b81bed69f59efcb8172a8c663a80112cce020c86145700b06ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a90000000000000000000000000000000000000000000000000000000000000000f4245e977593125fb15941b6c0a9260af4438bcd10355292a40b05df87f5d52006a7d517192c5c51218cc94c3d4af17f58daee089ba1fd44e3dbd98a000000000a6593863cba461564eae41373721546eb0151c9308276bbd4ad2a1c3a42107b4d95b024dc7e3b1c557941f94c98857fd0fbd274c5de0b473c02faab4544f83b020c0c000206010703040508090a0b1b33e685a4017f83adfeffff80f0fa02000000000100000000000000090200030c0200000030b30d0000000000",
//           "protocol_data": {
//               "makerAssetData": "0x546f6b656e6b65675166655a79694e77414a624e62474b50465843577542766639537336323356513544412d6d657461706c65782d345759386d4c794746734b6d647636534a6a6f626172516879417052567a577062544757374a6b62637256742d31",
//               "takerAssetData": "0x31313131313131313131313131313131313131313131313131313131313131312d736f6c616e612d302d3530303030303030",
//               "makerAddress": "3oCpKYw9npJFMxJ5A7dQnhLXHKR5TwHFdF9SWMx8h1C1",
//               "transaction": "0200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200070d298d7388b687b54186492ba0bb0ac1a3e32ecfb489d64320106a5bc242f0280e1b0c166eb2ef4ef0dbff195ebf4c6bc3d90512d98a8b50be3302c3146f7408476761663d17c215603d1c7b2b84690c494d09542800be96d69e2aa96f62ac315849c5e99524f07898034804274203258b3165710477bd5762d3d2d93ad0a4c3bf7148e73420afa3cdd6cf5f2f54fcc6b7223cc19452d47eeecbdf4d4a60628373af07d1ee9181fd19ef835ab98f58ba70e401626aede849e79d06f4eff8880da013ec37c61ecc94ec013a4282343d8f35c73fe85def65387aa1d2f96fbdc3fe9a2989d6a9ff6b2a168b81bed69f59efcb8172a8c663a80112cce020c86145700b06ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a90000000000000000000000000000000000000000000000000000000000000000f4245e977593125fb15941b6c0a9260af4438bcd10355292a40b05df87f5d52006a7d517192c5c51218cc94c3d4af17f58daee089ba1fd44e3dbd98a000000000a6593863cba461564eae41373721546eb0151c9308276bbd4ad2a1c3a42107b4d95b024dc7e3b1c557941f94c98857fd0fbd274c5de0b473c02faab4544f83b020c0c000206010703040508090a0b1b33e685a4017f83adfeffff80f0fa02000000000100000000000000090200030c0200000030b30d0000000000",
//               "matched": false
//           },
//           "protocol_address": "So11111111111111111111111111111111111111112",
//           "maker": {
//               "user": null,
//               "profile_img_url": "https://storage.googleapis.com/opensea-static/opensea-profile/10.png",
//               "address": "3oCpKYw9npJFMxJ5A7dQnhLXHKR5TwHFdF9SWMx8h1C1",
//               "config": ""
//           },
//           "taker": null,
//           "current_price": "50000000",
//           "maker_fees": [],
//           "taker_fees": [],
//           "side": "ask",
//           "order_type": "basic",
//           "cancelled": false,
//           "finalized": false,
//           "marked_invalid": true,
//           "client_signature": "78f1ec264cd1d3e045dc9aa4c073575c77832379351967db0e7a53cf84277236aa52e20ba73ba18d8a4ad96509841172aad35591497d7cefb71570fecc80ce0b",
//           "relay_id": "T3JkZXJWMlR5cGU6NjI1OTU1ODMwNQ",
//           "criteria_proof": null,
//           "maker_asset_bundle": {
//               "assets": [
//                   {
//                       "id": 410012621,
//                       "num_sales": 3,
//                       "background_color": null,
//                       "image_url": "https://lh3.googleusercontent.com/LS1xdXDjJOXseYzonEaue_batfCM8rPyTF2YRF3ou37SnzY5GWSHfSQ-MrRcdUgetxxmjfsnZzle0NYu4PSOeplKYNTEtHpLs47-",
//                       "image_preview_url": "https://lh3.googleusercontent.com/LS1xdXDjJOXseYzonEaue_batfCM8rPyTF2YRF3ou37SnzY5GWSHfSQ-MrRcdUgetxxmjfsnZzle0NYu4PSOeplKYNTEtHpLs47-=s250",
//                       "image_thumbnail_url": "https://lh3.googleusercontent.com/LS1xdXDjJOXseYzonEaue_batfCM8rPyTF2YRF3ou37SnzY5GWSHfSQ-MrRcdUgetxxmjfsnZzle0NYu4PSOeplKYNTEtHpLs47-=s128",
//                       "image_original_url": "https://www.arweave.net/vAAVvZMguu2xLNddv9Dd7swHQlISvYykbP3SiybEAPs?ext=png",
//                       "animation_url": null,
//                       "animation_original_url": null,
//                       "name": "MARMOSET #431",
//                       "description": "It's a banal life. We wake up, take a shower, put on our clothes, have breakfast, say goodbye to our family (if we have one) before heading out to work and leave once our shift ends. Some have regular jobs like retail managers and police officers, with regular hobbies like fishing, or poker, while others have less-than-usual jobs like cybernetic law enforcers (or lawbreakers) or cosmic beings (yep, it's a job - and some of them complain a lot). Life gives us lemons, and some make lemonade, others make lemon drops. However, we'll take bananas wherever we find them. Such is the life of Humans, and such is the life of MARMOSET.",
//                       "external_link": null,
//                       "asset_contract": {
//                           "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
//                           "asset_contract_type": "non-fungible",
//                           "created_date": "2022-03-26T23:09:14.980663",
//                           "name": "Token Program",
//                           "nft_version": null,
//                           "opensea_version": "2.0.0",
//                           "owner": null,
//                           "schema_name": "METAPLEX",
//                           "symbol": "SPL",
//                           "total_supply": null,
//                           "description": "BakedGods is a collection of 2000 deflationary Gods baked as fuck slumping through the Solana Blockchain\r\n486221",
//                           "external_link": null,
//                           "image_url": "https://lh3.googleusercontent.com/DKxSWhVxt7ehbCdqIbXxqoQF5LqSZJq4MGlpxCzR0LWm4msTDNEWfiBH5VgJWHNYnGole9S5D_Brv3byLes_LTdvHxdDamOAqo1TEg=s120",
//                           "default_to_fiat": false,
//                           "dev_buyer_fee_basis_points": 0,
//                           "dev_seller_fee_basis_points": 0,
//                           "only_proxied_transfers": false,
//                           "opensea_buyer_fee_basis_points": 0,
//                           "opensea_seller_fee_basis_points": 250,
//                           "buyer_fee_basis_points": 0,
//                           "seller_fee_basis_points": 250,
//                           "payout_address": null
//                       },
//                       "permalink": "https://opensea.io/assets/solana/4WY8mLyGFsKmdv6SJjobarQhyApRVzWpbTGW7JkbcrVt",
//                       "collection": {
//                           "banner_image_url": "https://lh3.googleusercontent.com/2TbvecvVjzFTQ3IapVFW8VlhDXNTKoFpZfSvCO0yATLyFmSthVgLphUSYnJhTdG3pIYx17hYBRdIvi9d3CpzcLYmn6koXJiUBtODsg=s2500",
//                           "chat_url": null,
//                           "created_date": "2022-04-29T06:38:19.698305",
//                           "default_to_fiat": false,
//                           "description": "The Marmosets escaped from Drier Atlantic to bring a new taste to #Solana. Holders can earn $MARMO to be able to upgrade their collection to Genomation Marmo for more $MARMO and also a bigger chance in the giveaway draw.",
//                           "dev_buyer_fee_basis_points": "0",
//                           "dev_seller_fee_basis_points": "0",
//                           "discord_url": "https://discord.gg/E7kmgUb8Cn",
//                           "display_data": {
//                               "card_display_style": "cover"
//                           },
//                           "external_url": "https://www.marmosetnft.xyz/",
//                           "featured": false,
//                           "featured_image_url": "https://lh3.googleusercontent.com/MhJ_9TNex5n0_6T3PEgmIR5-UvsMZFSCMuk8hIS5ySnpjknPXQxQqI3qw7yNmVgDQGvITiSYbzo5CVUk6jpmzaVfayL_8-ZISQO30wM=s300",
//                           "hidden": false,
//                           "safelist_request_status": "approved",
//                           "image_url": "https://lh3.googleusercontent.com/MhJ_9TNex5n0_6T3PEgmIR5-UvsMZFSCMuk8hIS5ySnpjknPXQxQqI3qw7yNmVgDQGvITiSYbzo5CVUk6jpmzaVfayL_8-ZISQO30wM=s120",
//                           "is_subject_to_whitelist": false,
//                           "large_image_url": "https://lh3.googleusercontent.com/MhJ_9TNex5n0_6T3PEgmIR5-UvsMZFSCMuk8hIS5ySnpjknPXQxQqI3qw7yNmVgDQGvITiSYbzo5CVUk6jpmzaVfayL_8-ZISQO30wM=s300",
//                           "medium_username": null,
//                           "name": "The Marmoset",
//                           "only_proxied_transfers": false,
//                           "opensea_buyer_fee_basis_points": "0",
//                           "opensea_seller_fee_basis_points": "250",
//                           "payout_address": null,
//                           "require_email": false,
//                           "short_description": null,
//                           "slug": "the-marmoset",
//                           "telegram_url": null,
//                           "twitter_username": null,
//                           "instagram_username": null,
//                           "wiki_url": null,
//                           "is_nsfw": false
//                       },
//                       "decimals": null,
//                       "token_metadata": "https://arweave.net/qv1ZNuXXg3KBjbG_NJFaIhWBXNQ1xn4X8UQ5rvTCArs/",
//                       "is_nsfw": false,
//                       "owner": {
//                           "user": null,
//                           "profile_img_url": "https://storage.googleapis.com/opensea-static/opensea-profile/1.png",
//                           "address": "0x0000000000000000000000000000000000000000",
//                           "config": ""
//                       },
//                       "token_id": "4WY8mLyGFsKmdv6SJjobarQhyApRVzWpbTGW7JkbcrVt"
//                   }
//               ],
//               "maker": null,
//               "slug": null,
//               "name": null,
//               "description": null,
//               "external_link": null,
//               "asset_contract": {
//                   "collection": {
//                       "banner_image_url": null,
//                       "chat_url": null,
//                       "created_date": "2022-04-25T15:03:54.885609",
//                       "default_to_fiat": false,
//                       "description": "BakedGods is a collection of 2000 deflationary Gods baked as fuck slumping through the Solana Blockchain\r\n486221",
//                       "dev_buyer_fee_basis_points": "0",
//                       "dev_seller_fee_basis_points": "0",
//                       "discord_url": "https://discord.gg/bakedgods",
//                       "display_data": {
//                           "card_display_style": "contain"
//                       },
//                       "external_url": null,
//                       "featured": false,
//                       "featured_image_url": null,
//                       "hidden": false,
//                       "safelist_request_status": "not_requested",
//                       "image_url": "https://lh3.googleusercontent.com/DKxSWhVxt7ehbCdqIbXxqoQF5LqSZJq4MGlpxCzR0LWm4msTDNEWfiBH5VgJWHNYnGole9S5D_Brv3byLes_LTdvHxdDamOAqo1TEg=s120",
//                       "is_subject_to_whitelist": false,
//                       "large_image_url": "https://lh3.googleusercontent.com/DKxSWhVxt7ehbCdqIbXxqoQF5LqSZJq4MGlpxCzR0LWm4msTDNEWfiBH5VgJWHNYnGole9S5D_Brv3byLes_LTdvHxdDamOAqo1TEg",
//                       "medium_username": null,
//                       "name": "BakedGods",
//                       "only_proxied_transfers": false,
//                       "opensea_buyer_fee_basis_points": "0",
//                       "opensea_seller_fee_basis_points": "250",
//                       "payout_address": null,
//                       "require_email": false,
//                       "short_description": null,
//                       "slug": "bakedgods",
//                       "telegram_url": null,
//                       "twitter_username": null,
//                       "instagram_username": null,
//                       "wiki_url": null,
//                       "is_nsfw": false
//                   },
//                   "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
//                   "asset_contract_type": "non-fungible",
//                   "created_date": "2022-03-26T23:09:14.980663",
//                   "name": "Token Program",
//                   "nft_version": null,
//                   "opensea_version": "2.0.0",
//                   "owner": null,
//                   "schema_name": "METAPLEX",
//                   "symbol": "SPL",
//                   "total_supply": null,
//                   "description": "BakedGods is a collection of 2000 deflationary Gods baked as fuck slumping through the Solana Blockchain\r\n486221",
//                   "external_link": null,
//                   "image_url": "https://lh3.googleusercontent.com/DKxSWhVxt7ehbCdqIbXxqoQF5LqSZJq4MGlpxCzR0LWm4msTDNEWfiBH5VgJWHNYnGole9S5D_Brv3byLes_LTdvHxdDamOAqo1TEg=s120",
//                   "default_to_fiat": false,
//                   "dev_buyer_fee_basis_points": 0,
//                   "dev_seller_fee_basis_points": 0,
//                   "only_proxied_transfers": false,
//                   "opensea_buyer_fee_basis_points": 0,
//                   "opensea_seller_fee_basis_points": 250,
//                   "buyer_fee_basis_points": 0,
//                   "seller_fee_basis_points": 250,
//                   "payout_address": null
//               },
//               "permalink": "https://opensea.io/bundles/None",
//               "seaport_sell_orders": null
//           },
//           "taker_asset_bundle": {
//               "assets": [
//                   {
//                       "id": 352040453,
//                       "num_sales": 0,
//                       "background_color": null,
//                       "image_url": "https://static.opensea.io/solana-just-s-symbol-colored.svg",
//                       "image_preview_url": "https://static.opensea.io/solana-just-s-symbol-colored.svg",
//                       "image_thumbnail_url": "https://static.opensea.io/solana-just-s-symbol-colored.svg",
//                       "image_original_url": "https://static.opensea.io/solana-just-s-symbol-colored.svg",
//                       "animation_url": null,
//                       "animation_original_url": null,
//                       "name": "Solana",
//                       "description": "",
//                       "external_link": null,
//                       "asset_contract": {
//                           "address": "11111111111111111111111111111111",
//                           "asset_contract_type": "fungible",
//                           "created_date": "2022-03-26T22:46:53.685553",
//                           "name": "System Program",
//                           "nft_version": null,
//                           "opensea_version": null,
//                           "owner": null,
//                           "schema_name": "SOLANA",
//                           "symbol": "",
//                           "total_supply": null,
//                           "description": null,
//                           "external_link": null,
//                           "image_url": null,
//                           "default_to_fiat": false,
//                           "dev_buyer_fee_basis_points": 0,
//                           "dev_seller_fee_basis_points": 0,
//                           "only_proxied_transfers": false,
//                           "opensea_buyer_fee_basis_points": 0,
//                           "opensea_seller_fee_basis_points": 250,
//                           "buyer_fee_basis_points": 0,
//                           "seller_fee_basis_points": 250,
//                           "payout_address": null
//                       },
//                       "permalink": "https://opensea.io/assets/solana/0",
//                       "collection": {
//                           "banner_image_url": null,
//                           "chat_url": null,
//                           "created_date": "2022-03-26T23:09:14.899407",
//                           "default_to_fiat": false,
//                           "description": null,
//                           "dev_buyer_fee_basis_points": "0",
//                           "dev_seller_fee_basis_points": "0",
//                           "discord_url": null,
//                           "display_data": {
//                               "card_display_style": "contain",
//                               "images": []
//                           },
//                           "external_url": null,
//                           "featured": false,
//                           "featured_image_url": null,
//                           "hidden": true,
//                           "safelist_request_status": "not_requested",
//                           "image_url": null,
//                           "is_subject_to_whitelist": false,
//                           "large_image_url": null,
//                           "medium_username": null,
//                           "name": "Solana",
//                           "only_proxied_transfers": false,
//                           "opensea_buyer_fee_basis_points": "0",
//                           "opensea_seller_fee_basis_points": "250",
//                           "payout_address": null,
//                           "require_email": false,
//                           "short_description": null,
//                           "slug": "P7M9hiXKLMqboCH",
//                           "telegram_url": null,
//                           "twitter_username": null,
//                           "instagram_username": null,
//                           "wiki_url": null,
//                           "is_nsfw": false
//                       },
//                       "decimals": 9,
//                       "token_metadata": "",
//                       "is_nsfw": false,
//                       "owner": {
//                           "user": {
//                               "username": "SolanaSystemProgram"
//                           },
//                           "profile_img_url": "https://storage.googleapis.com/opensea-static/opensea-profile/4.png",
//                           "address": "11111111111111111111111111111111",
//                           "config": ""
//                       },
//                       "token_id": "0"
//                   }
//               ],
//               "maker": null,
//               "slug": null,
//               "name": null,
//               "description": null,
//               "external_link": null,
//               "asset_contract": {
//                   "collection": {
//                       "banner_image_url": null,
//                       "chat_url": null,
//                       "created_date": "2022-03-26T23:09:14.899407",
//                       "default_to_fiat": false,
//                       "description": null,
//                       "dev_buyer_fee_basis_points": "0",
//                       "dev_seller_fee_basis_points": "0",
//                       "discord_url": null,
//                       "display_data": {
//                           "card_display_style": "contain",
//                           "images": []
//                       },
//                       "external_url": null,
//                       "featured": false,
//                       "featured_image_url": null,
//                       "hidden": true,
//                       "safelist_request_status": "not_requested",
//                       "image_url": null,
//                       "is_subject_to_whitelist": false,
//                       "large_image_url": null,
//                       "medium_username": null,
//                       "name": "Solana",
//                       "only_proxied_transfers": false,
//                       "opensea_buyer_fee_basis_points": "0",
//                       "opensea_seller_fee_basis_points": "250",
//                       "payout_address": null,
//                       "require_email": false,
//                       "short_description": null,
//                       "slug": "P7M9hiXKLMqboCH",
//                       "telegram_url": null,
//                       "twitter_username": null,
//                       "instagram_username": null,
//                       "wiki_url": null,
//                       "is_nsfw": false
//                   },
//                   "address": "11111111111111111111111111111111",
//                   "asset_contract_type": "fungible",
//                   "created_date": "2022-03-26T22:46:53.685553",
//                   "name": "System Program",
//                   "nft_version": null,
//                   "opensea_version": null,
//                   "owner": null,
//                   "schema_name": "SOLANA",
//                   "symbol": "",
//                   "total_supply": null,
//                   "description": null,
//                   "external_link": null,
//                   "image_url": null,
//                   "default_to_fiat": false,
//                   "dev_buyer_fee_basis_points": 0,
//                   "dev_seller_fee_basis_points": 0,
//                   "only_proxied_transfers": false,
//                   "opensea_buyer_fee_basis_points": 0,
//                   "opensea_seller_fee_basis_points": 250,
//                   "buyer_fee_basis_points": 0,
//                   "seller_fee_basis_points": 250,
//                   "payout_address": null
//               },
//               "permalink": "https://opensea.io/bundles/None",
//               "seaport_sell_orders": null
//           }
//       }
export type OSOrder = {
  // Some ID used for putting in bids?
  relay_id: string;
  // Unix SECONDS (not MS).
  listing_time: number;
  expiration_time: number;
  // Price in lamports
  current_price: string;
};

// While an order (bid) or listing may appear active on AH,
// OpenSea actually has some off-chain state to determine if you can actually
// cross the bid/listing (since they require co-signing).
// Use this to determine if the bid/listing is actually valid for OS.
export const listOSActiveOrdersOrListings = async (
  type: 'offers' | 'listings',
  {
    tokenMint,
    apiKey,
    maker,
    listedAfter: listed_after,
    listedBefore: listed_before,
    orderBy: order_by,
    orderDir: order_direction,
  }: {
    tokenMint: string;
    apiKey: string;
    maker?: string;
    // Unix SECONDS.
    listedAfter?: number;
    listedBefore?: number;
    // eth_price (sic)
    orderBy?: 'created_date' | 'eth_price';
    orderDir?: 'asc' | 'desc';
  },
) => {
  const { data } = await axios.get(
    `${OS_BASE_PATH}/api/v2/orders/solana/auction-house/${type}`,
    {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        ...(apiKey === undefined ? {} : { 'x-api-key': apiKey }),
      },
      params: {
        asset_contract_address: OS_ASSET_CONTRACT_ADDRESS,
        token_ids: tokenMint,
        maker,
        listed_after,
        listed_before,
        order_by,
        order_direction,
      },
    },
  );

  // NB: data also has previous/next cursors... which may be of use later.
  return data.orders as OSOrder[];
};

export const requestOSOfferOrListingTx = async (
  type: 'offer' | 'listing',
  {
    tokenMint,
    maker,
    priceLamports,
    apiKey,
  }: {
    tokenMint: string;
    // Bidder if 'offer'; seller if 'listing'
    maker: string;
    priceLamports: BN;
    apiKey: string;
  },
): Promise<OSReceivedOrderData> => {
  console.debug(`Requesting OS ${type} tx...`);

  const { data } = await axios({
    method: 'POST',
    url: `${OS_BASE_PATH}/api/v2/nfts/solana/${tokenMint}/${type}-action`,
    data: {
      maker_address: maker,
      price_lamports: priceLamports.toNumber(),
      order_type: 'basic',
    },
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
  });

  return data;
};

// This is for accepting a bid(?).
export const requestOSFulfillmentTx = async ({
  relayId,
  taker,
  apiKey,
}: {
  relayId: string;
  // The lister basically who is fulfilling a bid.
  taker: string;
  apiKey: string;
}): Promise<OSReceivedOrderData> => {
  console.debug('Requesting OS fulfillment tx...');

  const { data } = await axios({
    method: 'POST',
    url: `${OS_BASE_PATH}/api/v2/orders/${relayId}/fulfillment-action`,
    data: {
      taker_address: taker,
      taker_fill_amount: 1,
    },
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
  });

  return data;
};
