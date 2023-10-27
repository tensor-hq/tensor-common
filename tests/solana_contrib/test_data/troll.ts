export type Troll = {
  version: '0.1.0';
  name: 'troll';
  constants: [
    {
      name: 'ROLL_STATE_SEED';
      type: 'bytes';
      value: '[114, 111, 108, 108, 95, 115, 116, 97, 116, 101]';
    },
    {
      name: 'BUYER_SEED';
      type: 'bytes';
      value: '[98, 117, 121, 101, 114]';
    },
    {
      name: 'ROLLER_SEED';
      type: 'bytes';
      value: '[114, 111, 108, 108, 101, 114]';
    },
    {
      name: 'TREASURY_SEED';
      type: 'bytes';
      value: '[116, 114, 101, 97, 115, 117, 114, 121]';
    },
    {
      name: 'ROLLER_STATE_SIZE';
      type: {
        defined: 'usize';
      };
      value: '8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 6 + 64';
    },
    {
      name: 'ROLL_STATE_HEADER_SIZE';
      type: {
        defined: 'usize';
      };
      value: '8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 4 + 1 + 1 + 1 + 1 + 128 + 4';
    },
    {
      name: 'TROLL_ADDR';
      type: 'string';
      value: '"TRoLL7U1qTaqv2FFQ4jneZx5SetannKmrYCR778AkQZ"';
    },
    {
      name: 'HUNDRED_BPS';
      type: 'u64';
      value: '10000';
    },
    {
      name: 'CURRENT_TROLL_VERSION';
      type: 'u8';
      value: '1';
    },
    {
      name: 'WAGER_REBATE_BPS';
      type: 'u64';
      value: '50';
    },
    {
      name: 'TENSOR_FEE_BPS';
      type: 'u64';
      value: '150';
    },
    {
      name: 'TENSOR_FIXED_FEE';
      type: 'u64';
      value: '10000000';
    },
    {
      name: 'CREATOR_FEE_BPS';
      type: 'u64';
      value: '100';
    },
    {
      name: 'LISTER_FEE_BPS';
      type: 'u64';
      value: '150';
    },
    {
      name: 'MIN_ODDS_BPS';
      type: 'u16';
      value: '500';
    },
    {
      name: 'MAX_ODDS_BPS';
      type: 'u16';
      value: '7500';
    },
    {
      name: 'MIN_TAKER_PRICE';
      type: 'u64';
      value: '1781760';
    },
    {
      name: 'MAX_TAKER_PRICE';
      type: 'u64';
      value: '100000000000';
    },
    {
      name: 'MAX_TREASURY_BALANCE';
      type: 'u64';
      value: '10000000000000';
    },
    {
      name: 'TOKEN_RECORD_SIZE';
      type: {
        defined: 'usize';
      };
      value: '80';
    },
    {
      name: 'TROLL_ROLL_COSIGNER';
      type: 'string';
      value: '"5qGy8rknMjt1S6V2YMGVidtuHpj1BVs6chzpjCDb47sB"';
    },
    {
      name: 'TROLL_WITHDRAW_COSIGNER';
      type: 'string';
      value: '"C6v1Mb5K9gV1c7iYjEP5YWfQ2VLh1wjkmZ7bA3cJdKP8"';
    },
  ];
  instructions: [
    {
      name: 'trollNoop';
      accounts: [
        {
          name: 'trollSigner';
          isMut: false;
          isSigner: true;
        },
      ];
      args: [];
    },
    {
      name: 'commit';
      accounts: [
        {
          name: 'trollRollCosigner';
          isMut: false;
          isSigner: true;
        },
        {
          name: 'user';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'rollState';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'buyer';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'roller';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'treasury';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'trollProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'userNonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'secretHash';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'optionalRoyaltyPct';
          type: {
            option: 'u16';
          };
        },
        {
          name: 'wagerRebate';
          type: 'u64';
        },
        {
          name: 'rewards';
          type: {
            vec: {
              defined: 'RequestedRewardArg';
            };
          };
        },
      ];
    },
    {
      name: 'fulfillSol';
      accounts: [
        {
          name: 'trollRollCosigner';
          isMut: false;
          isSigner: true;
        },
        {
          name: 'fulfillSol';
          accounts: [
            {
              name: 'rollState';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'roller';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'buyer';
              isMut: true;
              isSigner: false;
              docs: [
                'PDA to hold SOL and sign to buy the NFT, remaining funds are swept to the treasury.',
              ];
            },
            {
              name: 'user';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'treasury';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'trollProgram';
              isMut: false;
              isSigner: false;
            },
          ];
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'secret';
          type: {
            array: ['u8', 32];
          };
        },
      ];
    },
    {
      name: 'fulfillNone';
      accounts: [
        {
          name: 'trollRollCosigner';
          isMut: false;
          isSigner: true;
        },
        {
          name: 'user';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'rollState';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'roller';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'treasury';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'trollProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'secret';
          type: {
            array: ['u8', 32];
          };
        },
      ];
    },
    {
      name: 'fulfillTswapPool';
      accounts: [
        {
          name: 'trollRollCosigner';
          isMut: false;
          isSigner: true;
        },
        {
          name: 'fulfillSol';
          accounts: [
            {
              name: 'rollState';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'roller';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'buyer';
              isMut: true;
              isSigner: false;
              docs: [
                'PDA to hold SOL and sign to buy the NFT, remaining funds are swept to the treasury.',
              ];
            },
            {
              name: 'user';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'treasury';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'trollProgram';
              isMut: false;
              isSigner: false;
            },
          ];
        },
        {
          name: 'tswap';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'pool';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'whitelist';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'nftBuyerAcc';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftMint';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'nftMetadata';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftReceipt';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'solEscrow';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'owner';
          isMut: true;
          isSigner: false;
          docs: [
            'Owner of the Listing or Pool. Will additionally receive the lister fee.',
          ];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'associatedTokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tensorswap';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'nftEdition';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'authRules';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'marginAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'takerBroker';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftUserAcc';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'userTokenRecord';
          isMut: true;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'secret';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'rulesAccPresent';
          type: 'bool';
        },
        {
          name: 'authorizationData';
          type: {
            option: {
              defined: 'AuthorizationDataLocal';
            };
          };
        },
      ];
    },
    {
      name: 'fulfillTswapListing';
      accounts: [
        {
          name: 'trollRollCosigner';
          isMut: false;
          isSigner: true;
        },
        {
          name: 'fulfillSol';
          accounts: [
            {
              name: 'rollState';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'roller';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'buyer';
              isMut: true;
              isSigner: false;
              docs: [
                'PDA to hold SOL and sign to buy the NFT, remaining funds are swept to the treasury.',
              ];
            },
            {
              name: 'user';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'treasury';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'trollProgram';
              isMut: false;
              isSigner: false;
            },
          ];
        },
        {
          name: 'tswap';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'feeVault';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'listing';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftBuyerAcc';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftMint';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'nftMetadata';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftEscrow';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'owner';
          isMut: true;
          isSigner: false;
          docs: [
            'Owner of the Listing or Pool. Will additionally receive the lister fee.',
          ];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'associatedTokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tensorswap';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'nftEdition';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'ownerTokenRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'destTokenRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'authRules';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'takerBroker';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftUserAcc';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'userTokenRecord';
          isMut: true;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'secret';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'rulesAccPresent';
          type: 'bool';
        },
        {
          name: 'authorizationData';
          type: {
            option: {
              defined: 'AuthorizationDataLocal';
            };
          };
        },
      ];
    },
    {
      name: 'fulfillTcompListing';
      accounts: [
        {
          name: 'trollRollCosigner';
          isMut: false;
          isSigner: true;
        },
        {
          name: 'fulfillSol';
          accounts: [
            {
              name: 'rollState';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'roller';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'buyer';
              isMut: true;
              isSigner: false;
              docs: [
                'PDA to hold SOL and sign to buy the NFT, remaining funds are swept to the treasury.',
              ];
            },
            {
              name: 'user';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'treasury';
              isMut: true;
              isSigner: false;
            },
            {
              name: 'trollProgram';
              isMut: false;
              isSigner: false;
            },
          ];
        },
        {
          name: 'tcomp';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'treeAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'merkleTree';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'logWrapper';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'compressionProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'bubblegumProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tcompProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'listState';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'owner';
          isMut: true;
          isSigner: false;
          docs: [
            'Owner of the Listing or Pool. Will additionally receive the lister fee.',
          ];
        },
        {
          name: 'takerBroker';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'makerBroker';
          isMut: true;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'secret';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'nonce';
          type: 'u64';
        },
        {
          name: 'index';
          type: 'u32';
        },
        {
          name: 'root';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'metaHash';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'creatorShares';
          type: 'bytes';
        },
        {
          name: 'creatorVerified';
          type: {
            vec: 'bool';
          };
        },
        {
          name: 'makerBroker';
          type: {
            option: 'publicKey';
          };
        },
      ];
    },
    {
      name: 'withdraw';
      accounts: [
        {
          name: 'trollWithdrawCosigner';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'treasury';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'minTreasuryBalance';
          type: 'u64';
        },
      ];
    },
  ];
  accounts: [
    {
      name: 'roller';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'user';
            type: 'publicKey';
          },
          {
            name: 'rollCount';
            type: 'u64';
          },
          {
            name: 'histWagered';
            type: 'u64';
          },
          {
            name: 'rebate';
            type: 'u64';
          },
          {
            name: 'lastPlayedDate';
            type: 'i64';
          },
          {
            name: 'lastPlayedSlot';
            type: 'u64';
          },
          {
            name: 'winStreak';
            type: 'u8';
          },
          {
            name: 'version';
            type: 'u8';
          },
          {
            name: 'reserved0';
            type: {
              array: ['u8', 6];
            };
          },
          {
            name: 'reserved1';
            type: {
              array: ['u8', 64];
            };
          },
        ];
      };
    },
    {
      name: 'rollState';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rollState';
            type: 'publicKey';
          },
          {
            name: 'user';
            type: 'publicKey';
          },
          {
            name: 'userNonce';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'secretHash';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'wager';
            type: 'u64';
          },
          {
            name: 'rollCount';
            type: 'u64';
          },
          {
            name: 'commitSlot';
            type: 'u64';
          },
          {
            name: 'optionalRoyaltyPct';
            type: {
              option: 'u16';
            };
          },
          {
            name: 'version';
            type: 'u8';
          },
          {
            name: 'bump';
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'buyerBump';
            docs: [
              'storing the bump makes fn buyer_seeds possible without upsetting the borrow checker',
            ];
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'reserved0';
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'reserved1';
            type: {
              array: ['u8', 128];
            };
          },
          {
            name: 'requestedRewards';
            type: {
              vec: {
                defined: 'RequestedReward';
              };
            };
          },
        ];
      };
    },
  ];
  types: [
    {
      name: 'CommitEvent';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rollState';
            type: 'publicKey';
          },
          {
            name: 'secretHash';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'user';
            type: 'publicKey';
          },
          {
            name: 'userNonce';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'rollCount';
            type: 'u64';
          },
          {
            name: 'commitSlot';
            type: 'u64';
          },
          {
            name: 'requestedRewards';
            type: {
              vec: {
                defined: 'RequestedReward';
              };
            };
          },
          {
            name: 'wager';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'FulfillEvent';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'reward';
            type: {
              defined: 'RequestedReward';
            };
          },
          {
            name: 'fallbackReward';
            type: {
              option: {
                defined: 'FallbackReward';
              };
            };
          },
          {
            name: 'secret';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'secretHash';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'user';
            type: 'publicKey';
          },
          {
            name: 'userNonce';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'commitSlot';
            type: 'u64';
          },
          {
            name: 'rollBps';
            type: 'u16';
          },
          {
            name: 'listerFee';
            type: 'u64';
          },
          {
            name: 'creatorFee';
            type: 'u64';
          },
          {
            name: 'tensorFee';
            type: 'u64';
          },
          {
            name: 'optionalRoyaltyPct';
            type: {
              option: 'u16';
            };
          },
          {
            name: 'rollCount';
            type: 'u64';
          },
          {
            name: 'histWagered';
            type: 'u64';
          },
          {
            name: 'rebate';
            type: 'u64';
          },
          {
            name: 'winStreak';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'FallbackReward';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'reason';
            type: {
              defined: 'FallbackReason';
            };
          },
          {
            name: 'mint';
            type: {
              option: 'publicKey';
            };
          },
          {
            name: 'amount';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'AuthorizationDataLocal';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'payload';
            type: {
              vec: {
                defined: 'TaggedPayload';
              };
            };
          },
        ];
      };
    },
    {
      name: 'TaggedPayload';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'name';
            type: 'string';
          },
          {
            name: 'payload';
            type: {
              defined: 'PayloadTypeLocal';
            };
          },
        ];
      };
    },
    {
      name: 'SeedsVecLocal';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'seeds';
            docs: ['The vector of derivation seeds.'];
            type: {
              vec: 'bytes';
            };
          },
        ];
      };
    },
    {
      name: 'ProofInfoLocal';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'proof';
            docs: ['The merkle proof.'];
            type: {
              vec: {
                array: ['u8', 32];
              };
            };
          },
        ];
      };
    },
    {
      name: 'RequestedRewardArg';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'oddsBps';
            type: 'u16';
          },
          {
            name: 'reward';
            type: {
              defined: 'Reward';
            };
          },
        ];
      };
    },
    {
      name: 'RequestedReward';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'postMarketFeesAmount';
            docs: ['all in TCOMP/TSWAP price'];
            type: 'u64';
          },
          {
            name: 'oddsBps';
            type: 'u16';
          },
          {
            name: 'reserved0';
            type: {
              array: ['u8', 4];
            };
          },
          {
            name: 'reward';
            type: {
              defined: 'Reward';
            };
          },
          {
            name: 'reserved1';
            type: {
              array: ['u8', 64];
            };
          },
        ];
      };
    },
    {
      name: 'RewardDetails';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'address';
            docs: ['Listing or Pool'];
            type: 'publicKey';
          },
          {
            name: 'mint';
            type: 'publicKey';
          },
          {
            name: 'owner';
            docs: ['Listing or Pool owner'];
            type: 'publicKey';
          },
          {
            name: 'paymentMint';
            type: {
              option: 'publicKey';
            };
          },
          {
            name: 'tokenStandard';
            type: {
              option: {
                defined: 'TokenStandardLocal';
              };
            };
          },
          {
            name: 'paymentBaseAmount';
            docs: ['base amount before TCOMP/TSWAP fees and royalties'];
            type: 'u64';
          },
          {
            name: 'royaltyBps';
            docs: ['TCOMP parameter'];
            type: 'u16';
          },
        ];
      };
    },
    {
      name: 'TRollEvent';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Commit';
            fields: [
              {
                defined: 'CommitEvent';
              },
            ];
          },
          {
            name: 'Fulfill';
            fields: [
              {
                defined: 'FulfillEvent';
              },
            ];
          },
        ];
      };
    },
    {
      name: 'FallbackReason';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'BadNft';
          },
          {
            name: 'BadListing';
          },
          {
            name: 'BadPool';
          },
          {
            name: 'NftReceiptGone';
          },
          {
            name: 'ListingGone';
          },
          {
            name: 'PoolGone';
          },
          {
            name: 'MarketCPIFailed';
          },
          {
            name: 'NftTransferFailed';
          },
          {
            name: 'CloseBuyerNftAccountFailed';
          },
          {
            name: 'DefaultMerkleTree';
          },
          {
            name: 'FulfillSolInstruction';
          },
          {
            name: 'Overflow';
          },
          {
            name: 'PoolCurrentPriceFailed';
          },
          {
            name: 'PaymentBaseAmountExceeded';
          },
          {
            name: 'PostMarketFeesAmountExceeded';
          },
          {
            name: 'MetadataGone';
          },
        ];
      };
    },
    {
      name: 'PayloadTypeLocal';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Pubkey';
            fields: ['publicKey'];
          },
          {
            name: 'Seeds';
            fields: [
              {
                defined: 'SeedsVecLocal';
              },
            ];
          },
          {
            name: 'MerkleProof';
            fields: [
              {
                defined: 'ProofInfoLocal';
              },
            ];
          },
          {
            name: 'Number';
            fields: ['u64'];
          },
        ];
      };
    },
    {
      name: 'TokenStandardLocal';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'NonFungible';
          },
          {
            name: 'FungibleAsset';
          },
          {
            name: 'Fungible';
          },
          {
            name: 'NonFungibleEdition';
          },
          {
            name: 'ProgrammableNonFungible';
          },
        ];
      };
    },
    {
      name: 'Reward';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'None';
          },
          {
            name: 'TCompListing';
            fields: [
              {
                name: 'details';
                type: {
                  defined: 'RewardDetails';
                };
              },
            ];
          },
          {
            name: 'TSwapPool';
            fields: [
              {
                name: 'details';
                type: {
                  defined: 'RewardDetails';
                };
              },
            ];
          },
          {
            name: 'TSwapListing';
            fields: [
              {
                name: 'details';
                type: {
                  defined: 'RewardDetails';
                };
              },
            ];
          },
        ];
      };
    },
  ];
  errors: [
    {
      code: 6001;
      name: 'OddsTooLow';
      msg: 'Odds are too low';
    },
    {
      code: 6002;
      name: 'OddsTooHigh';
      msg: 'Odds are too high';
    },
    {
      code: 6003;
      name: 'TakerPriceTooLow';
      msg: 'Taker price too low';
    },
    {
      code: 6004;
      name: 'TakerPriceTooHigh';
      msg: 'Taker price too high';
    },
    {
      code: 6005;
      name: 'OptionalRewardPctTooHigh';
      msg: 'Optional reward pct too high';
    },
    {
      code: 6006;
      name: 'BadHash';
      msg: 'Bad hash';
    },
    {
      code: 6007;
      name: 'InsufficientTreasury';
      msg: 'Insufficient treasury';
    },
    {
      code: 6008;
      name: 'RewardNotNone';
      msg: 'The reward was not None';
    },
    {
      code: 6009;
      name: 'RewardNotTCompListing';
      msg: 'The reward was not TComp';
    },
    {
      code: 6010;
      name: 'RewardNotTSwapPool';
      msg: 'The reward was not TSwap';
    },
    {
      code: 6011;
      name: 'RewardNotTSwapSingleListing';
      msg: 'The reward was not TSwap';
    },
    {
      code: 6012;
      name: 'RewardValueNotZero';
      msg: 'The reward None does not have a value 0';
    },
    {
      code: 6013;
      name: 'InvalidOddsSum';
      msg: 'The sum of odds does not equal 10_000';
    },
    {
      code: 6014;
      name: 'BadRent';
      msg: 'Bad rent calculation';
    },
    {
      code: 6015;
      name: 'BadTreasury';
      msg: 'Bad treasury';
    },
    {
      code: 6016;
      name: 'CreatorMismatch';
      msg: 'Bad creator';
    },
    {
      code: 6100;
      name: 'BadListing';
      msg: 'Bad listing';
    },
    {
      code: 6101;
      name: 'BadPool';
      msg: 'Bad pool';
    },
    {
      code: 6102;
      name: 'BadFeeWallet';
      msg: 'Bad fee wallet';
    },
    {
      code: 6103;
      name: 'BadReward';
      msg: 'Bad reward';
    },
    {
      code: 6200;
      name: 'NftTransferFailed';
      msg: 'TSWAP nft transfer failed';
    },
    {
      code: 6201;
      name: 'NftTransferRentDoesNotRemain';
      msg: 'The NFT was purchased, but all of the purchasing funds were taken, plus some rent';
    },
    {
      code: 6300;
      name: 'RollModOverflow';
      msg: 'Overflow modding roll to 10_000';
    },
    {
      code: 6301;
      name: 'ClaimWagerRebateOverflow';
      msg: 'Overflow claiming wager rebate';
    },
  ];
};

export const IDL: Troll = {
  version: '0.1.0',
  name: 'troll',
  constants: [
    {
      name: 'ROLL_STATE_SEED',
      type: 'bytes',
      value: '[114, 111, 108, 108, 95, 115, 116, 97, 116, 101]',
    },
    {
      name: 'BUYER_SEED',
      type: 'bytes',
      value: '[98, 117, 121, 101, 114]',
    },
    {
      name: 'ROLLER_SEED',
      type: 'bytes',
      value: '[114, 111, 108, 108, 101, 114]',
    },
    {
      name: 'TREASURY_SEED',
      type: 'bytes',
      value: '[116, 114, 101, 97, 115, 117, 114, 121]',
    },
    {
      name: 'ROLLER_STATE_SIZE',
      type: {
        defined: 'usize',
      },
      value: '8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 6 + 64',
    },
    {
      name: 'ROLL_STATE_HEADER_SIZE',
      type: {
        defined: 'usize',
      },
      value: '8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 4 + 1 + 1 + 1 + 1 + 128 + 4',
    },
    {
      name: 'TROLL_ADDR',
      type: 'string',
      value: '"TRoLL7U1qTaqv2FFQ4jneZx5SetannKmrYCR778AkQZ"',
    },
    {
      name: 'HUNDRED_BPS',
      type: 'u64',
      value: '10000',
    },
    {
      name: 'CURRENT_TROLL_VERSION',
      type: 'u8',
      value: '1',
    },
    {
      name: 'WAGER_REBATE_BPS',
      type: 'u64',
      value: '50',
    },
    {
      name: 'TENSOR_FEE_BPS',
      type: 'u64',
      value: '150',
    },
    {
      name: 'TENSOR_FIXED_FEE',
      type: 'u64',
      value: '10000000',
    },
    {
      name: 'CREATOR_FEE_BPS',
      type: 'u64',
      value: '100',
    },
    {
      name: 'LISTER_FEE_BPS',
      type: 'u64',
      value: '150',
    },
    {
      name: 'MIN_ODDS_BPS',
      type: 'u16',
      value: '500',
    },
    {
      name: 'MAX_ODDS_BPS',
      type: 'u16',
      value: '7500',
    },
    {
      name: 'MIN_TAKER_PRICE',
      type: 'u64',
      value: '1781760',
    },
    {
      name: 'MAX_TAKER_PRICE',
      type: 'u64',
      value: '100000000000',
    },
    {
      name: 'MAX_TREASURY_BALANCE',
      type: 'u64',
      value: '10000000000000',
    },
    {
      name: 'TOKEN_RECORD_SIZE',
      type: {
        defined: 'usize',
      },
      value: '80',
    },
    {
      name: 'TROLL_ROLL_COSIGNER',
      type: 'string',
      value: '"5qGy8rknMjt1S6V2YMGVidtuHpj1BVs6chzpjCDb47sB"',
    },
    {
      name: 'TROLL_WITHDRAW_COSIGNER',
      type: 'string',
      value: '"C6v1Mb5K9gV1c7iYjEP5YWfQ2VLh1wjkmZ7bA3cJdKP8"',
    },
  ],
  instructions: [
    {
      name: 'trollNoop',
      accounts: [
        {
          name: 'trollSigner',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [],
    },
    {
      name: 'commit',
      accounts: [
        {
          name: 'trollRollCosigner',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'user',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'rollState',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'buyer',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'roller',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'treasury',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'trollProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'userNonce',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'secretHash',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'optionalRoyaltyPct',
          type: {
            option: 'u16',
          },
        },
        {
          name: 'wagerRebate',
          type: 'u64',
        },
        {
          name: 'rewards',
          type: {
            vec: {
              defined: 'RequestedRewardArg',
            },
          },
        },
      ],
    },
    {
      name: 'fulfillSol',
      accounts: [
        {
          name: 'trollRollCosigner',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'fulfillSol',
          accounts: [
            {
              name: 'rollState',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'roller',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'buyer',
              isMut: true,
              isSigner: false,
              docs: [
                'PDA to hold SOL and sign to buy the NFT, remaining funds are swept to the treasury.',
              ],
            },
            {
              name: 'user',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'treasury',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'trollProgram',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'secret',
          type: {
            array: ['u8', 32],
          },
        },
      ],
    },
    {
      name: 'fulfillNone',
      accounts: [
        {
          name: 'trollRollCosigner',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'user',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'rollState',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'roller',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'treasury',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'trollProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'secret',
          type: {
            array: ['u8', 32],
          },
        },
      ],
    },
    {
      name: 'fulfillTswapPool',
      accounts: [
        {
          name: 'trollRollCosigner',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'fulfillSol',
          accounts: [
            {
              name: 'rollState',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'roller',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'buyer',
              isMut: true,
              isSigner: false,
              docs: [
                'PDA to hold SOL and sign to buy the NFT, remaining funds are swept to the treasury.',
              ],
            },
            {
              name: 'user',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'treasury',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'trollProgram',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'tswap',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'pool',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'whitelist',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'nftBuyerAcc',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'nftMetadata',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftReceipt',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'solEscrow',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: false,
          docs: [
            'Owner of the Listing or Pool. Will additionally receive the lister fee.',
          ],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tensorswap',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'nftEdition',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'authRules',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'marginAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'takerBroker',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftUserAcc',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'userTokenRecord',
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'secret',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'rulesAccPresent',
          type: 'bool',
        },
        {
          name: 'authorizationData',
          type: {
            option: {
              defined: 'AuthorizationDataLocal',
            },
          },
        },
      ],
    },
    {
      name: 'fulfillTswapListing',
      accounts: [
        {
          name: 'trollRollCosigner',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'fulfillSol',
          accounts: [
            {
              name: 'rollState',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'roller',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'buyer',
              isMut: true,
              isSigner: false,
              docs: [
                'PDA to hold SOL and sign to buy the NFT, remaining funds are swept to the treasury.',
              ],
            },
            {
              name: 'user',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'treasury',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'trollProgram',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'tswap',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'feeVault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'listing',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftBuyerAcc',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'nftMetadata',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftEscrow',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: false,
          docs: [
            'Owner of the Listing or Pool. Will additionally receive the lister fee.',
          ],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tensorswap',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'nftEdition',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'ownerTokenRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'destTokenRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'authRules',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'takerBroker',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftUserAcc',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'userTokenRecord',
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'secret',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'rulesAccPresent',
          type: 'bool',
        },
        {
          name: 'authorizationData',
          type: {
            option: {
              defined: 'AuthorizationDataLocal',
            },
          },
        },
      ],
    },
    {
      name: 'fulfillTcompListing',
      accounts: [
        {
          name: 'trollRollCosigner',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'fulfillSol',
          accounts: [
            {
              name: 'rollState',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'roller',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'buyer',
              isMut: true,
              isSigner: false,
              docs: [
                'PDA to hold SOL and sign to buy the NFT, remaining funds are swept to the treasury.',
              ],
            },
            {
              name: 'user',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'treasury',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'trollProgram',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'tcomp',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'treeAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'merkleTree',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'logWrapper',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'compressionProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'bubblegumProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tcompProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'listState',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: false,
          docs: [
            'Owner of the Listing or Pool. Will additionally receive the lister fee.',
          ],
        },
        {
          name: 'takerBroker',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'makerBroker',
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'secret',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'nonce',
          type: 'u64',
        },
        {
          name: 'index',
          type: 'u32',
        },
        {
          name: 'root',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'metaHash',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'creatorShares',
          type: 'bytes',
        },
        {
          name: 'creatorVerified',
          type: {
            vec: 'bool',
          },
        },
        {
          name: 'makerBroker',
          type: {
            option: 'publicKey',
          },
        },
      ],
    },
    {
      name: 'withdraw',
      accounts: [
        {
          name: 'trollWithdrawCosigner',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'treasury',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'minTreasuryBalance',
          type: 'u64',
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'roller',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'user',
            type: 'publicKey',
          },
          {
            name: 'rollCount',
            type: 'u64',
          },
          {
            name: 'histWagered',
            type: 'u64',
          },
          {
            name: 'rebate',
            type: 'u64',
          },
          {
            name: 'lastPlayedDate',
            type: 'i64',
          },
          {
            name: 'lastPlayedSlot',
            type: 'u64',
          },
          {
            name: 'winStreak',
            type: 'u8',
          },
          {
            name: 'version',
            type: 'u8',
          },
          {
            name: 'reserved0',
            type: {
              array: ['u8', 6],
            },
          },
          {
            name: 'reserved1',
            type: {
              array: ['u8', 64],
            },
          },
        ],
      },
    },
    {
      name: 'rollState',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'rollState',
            type: 'publicKey',
          },
          {
            name: 'user',
            type: 'publicKey',
          },
          {
            name: 'userNonce',
            type: {
              array: ['u8', 32],
            },
          },
          {
            name: 'secretHash',
            type: {
              array: ['u8', 32],
            },
          },
          {
            name: 'wager',
            type: 'u64',
          },
          {
            name: 'rollCount',
            type: 'u64',
          },
          {
            name: 'commitSlot',
            type: 'u64',
          },
          {
            name: 'optionalRoyaltyPct',
            type: {
              option: 'u16',
            },
          },
          {
            name: 'version',
            type: 'u8',
          },
          {
            name: 'bump',
            type: {
              array: ['u8', 1],
            },
          },
          {
            name: 'buyerBump',
            docs: [
              'storing the bump makes fn buyer_seeds possible without upsetting the borrow checker',
            ],
            type: {
              array: ['u8', 1],
            },
          },
          {
            name: 'reserved0',
            type: {
              array: ['u8', 1],
            },
          },
          {
            name: 'reserved1',
            type: {
              array: ['u8', 128],
            },
          },
          {
            name: 'requestedRewards',
            type: {
              vec: {
                defined: 'RequestedReward',
              },
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'CommitEvent',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'rollState',
            type: 'publicKey',
          },
          {
            name: 'secretHash',
            type: {
              array: ['u8', 32],
            },
          },
          {
            name: 'user',
            type: 'publicKey',
          },
          {
            name: 'userNonce',
            type: {
              array: ['u8', 32],
            },
          },
          {
            name: 'rollCount',
            type: 'u64',
          },
          {
            name: 'commitSlot',
            type: 'u64',
          },
          {
            name: 'requestedRewards',
            type: {
              vec: {
                defined: 'RequestedReward',
              },
            },
          },
          {
            name: 'wager',
            type: 'u64',
          },
        ],
      },
    },
    {
      name: 'FulfillEvent',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'reward',
            type: {
              defined: 'RequestedReward',
            },
          },
          {
            name: 'fallbackReward',
            type: {
              option: {
                defined: 'FallbackReward',
              },
            },
          },
          {
            name: 'secret',
            type: {
              array: ['u8', 32],
            },
          },
          {
            name: 'secretHash',
            type: {
              array: ['u8', 32],
            },
          },
          {
            name: 'user',
            type: 'publicKey',
          },
          {
            name: 'userNonce',
            type: {
              array: ['u8', 32],
            },
          },
          {
            name: 'commitSlot',
            type: 'u64',
          },
          {
            name: 'rollBps',
            type: 'u16',
          },
          {
            name: 'listerFee',
            type: 'u64',
          },
          {
            name: 'creatorFee',
            type: 'u64',
          },
          {
            name: 'tensorFee',
            type: 'u64',
          },
          {
            name: 'optionalRoyaltyPct',
            type: {
              option: 'u16',
            },
          },
          {
            name: 'rollCount',
            type: 'u64',
          },
          {
            name: 'histWagered',
            type: 'u64',
          },
          {
            name: 'rebate',
            type: 'u64',
          },
          {
            name: 'winStreak',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'FallbackReward',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'reason',
            type: {
              defined: 'FallbackReason',
            },
          },
          {
            name: 'mint',
            type: {
              option: 'publicKey',
            },
          },
          {
            name: 'amount',
            type: 'u64',
          },
        ],
      },
    },
    {
      name: 'AuthorizationDataLocal',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'payload',
            type: {
              vec: {
                defined: 'TaggedPayload',
              },
            },
          },
        ],
      },
    },
    {
      name: 'TaggedPayload',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'payload',
            type: {
              defined: 'PayloadTypeLocal',
            },
          },
        ],
      },
    },
    {
      name: 'SeedsVecLocal',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'seeds',
            docs: ['The vector of derivation seeds.'],
            type: {
              vec: 'bytes',
            },
          },
        ],
      },
    },
    {
      name: 'ProofInfoLocal',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'proof',
            docs: ['The merkle proof.'],
            type: {
              vec: {
                array: ['u8', 32],
              },
            },
          },
        ],
      },
    },
    {
      name: 'RequestedRewardArg',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'oddsBps',
            type: 'u16',
          },
          {
            name: 'reward',
            type: {
              defined: 'Reward',
            },
          },
        ],
      },
    },
    {
      name: 'RequestedReward',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'postMarketFeesAmount',
            docs: ['all in TCOMP/TSWAP price'],
            type: 'u64',
          },
          {
            name: 'oddsBps',
            type: 'u16',
          },
          {
            name: 'reserved0',
            type: {
              array: ['u8', 4],
            },
          },
          {
            name: 'reward',
            type: {
              defined: 'Reward',
            },
          },
          {
            name: 'reserved1',
            type: {
              array: ['u8', 64],
            },
          },
        ],
      },
    },
    {
      name: 'RewardDetails',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'address',
            docs: ['Listing or Pool'],
            type: 'publicKey',
          },
          {
            name: 'mint',
            type: 'publicKey',
          },
          {
            name: 'owner',
            docs: ['Listing or Pool owner'],
            type: 'publicKey',
          },
          {
            name: 'paymentMint',
            type: {
              option: 'publicKey',
            },
          },
          {
            name: 'tokenStandard',
            type: {
              option: {
                defined: 'TokenStandardLocal',
              },
            },
          },
          {
            name: 'paymentBaseAmount',
            docs: ['base amount before TCOMP/TSWAP fees and royalties'],
            type: 'u64',
          },
          {
            name: 'royaltyBps',
            docs: ['TCOMP parameter'],
            type: 'u16',
          },
        ],
      },
    },
    {
      name: 'TRollEvent',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Commit',
            fields: [
              {
                defined: 'CommitEvent',
              },
            ],
          },
          {
            name: 'Fulfill',
            fields: [
              {
                defined: 'FulfillEvent',
              },
            ],
          },
        ],
      },
    },
    {
      name: 'FallbackReason',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'BadNft',
          },
          {
            name: 'BadListing',
          },
          {
            name: 'BadPool',
          },
          {
            name: 'NftReceiptGone',
          },
          {
            name: 'ListingGone',
          },
          {
            name: 'PoolGone',
          },
          {
            name: 'MarketCPIFailed',
          },
          {
            name: 'NftTransferFailed',
          },
          {
            name: 'CloseBuyerNftAccountFailed',
          },
          {
            name: 'DefaultMerkleTree',
          },
          {
            name: 'FulfillSolInstruction',
          },
          {
            name: 'Overflow',
          },
          {
            name: 'PoolCurrentPriceFailed',
          },
          {
            name: 'PaymentBaseAmountExceeded',
          },
          {
            name: 'PostMarketFeesAmountExceeded',
          },
          {
            name: 'MetadataGone',
          },
        ],
      },
    },
    {
      name: 'PayloadTypeLocal',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Pubkey',
            fields: ['publicKey'],
          },
          {
            name: 'Seeds',
            fields: [
              {
                defined: 'SeedsVecLocal',
              },
            ],
          },
          {
            name: 'MerkleProof',
            fields: [
              {
                defined: 'ProofInfoLocal',
              },
            ],
          },
          {
            name: 'Number',
            fields: ['u64'],
          },
        ],
      },
    },
    {
      name: 'TokenStandardLocal',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'NonFungible',
          },
          {
            name: 'FungibleAsset',
          },
          {
            name: 'Fungible',
          },
          {
            name: 'NonFungibleEdition',
          },
          {
            name: 'ProgrammableNonFungible',
          },
        ],
      },
    },
    {
      name: 'Reward',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'None',
          },
          {
            name: 'TCompListing',
            fields: [
              {
                name: 'details',
                type: {
                  defined: 'RewardDetails',
                },
              },
            ],
          },
          {
            name: 'TSwapPool',
            fields: [
              {
                name: 'details',
                type: {
                  defined: 'RewardDetails',
                },
              },
            ],
          },
          {
            name: 'TSwapListing',
            fields: [
              {
                name: 'details',
                type: {
                  defined: 'RewardDetails',
                },
              },
            ],
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6001,
      name: 'OddsTooLow',
      msg: 'Odds are too low',
    },
    {
      code: 6002,
      name: 'OddsTooHigh',
      msg: 'Odds are too high',
    },
    {
      code: 6003,
      name: 'TakerPriceTooLow',
      msg: 'Taker price too low',
    },
    {
      code: 6004,
      name: 'TakerPriceTooHigh',
      msg: 'Taker price too high',
    },
    {
      code: 6005,
      name: 'OptionalRewardPctTooHigh',
      msg: 'Optional reward pct too high',
    },
    {
      code: 6006,
      name: 'BadHash',
      msg: 'Bad hash',
    },
    {
      code: 6007,
      name: 'InsufficientTreasury',
      msg: 'Insufficient treasury',
    },
    {
      code: 6008,
      name: 'RewardNotNone',
      msg: 'The reward was not None',
    },
    {
      code: 6009,
      name: 'RewardNotTCompListing',
      msg: 'The reward was not TComp',
    },
    {
      code: 6010,
      name: 'RewardNotTSwapPool',
      msg: 'The reward was not TSwap',
    },
    {
      code: 6011,
      name: 'RewardNotTSwapSingleListing',
      msg: 'The reward was not TSwap',
    },
    {
      code: 6012,
      name: 'RewardValueNotZero',
      msg: 'The reward None does not have a value 0',
    },
    {
      code: 6013,
      name: 'InvalidOddsSum',
      msg: 'The sum of odds does not equal 10_000',
    },
    {
      code: 6014,
      name: 'BadRent',
      msg: 'Bad rent calculation',
    },
    {
      code: 6015,
      name: 'BadTreasury',
      msg: 'Bad treasury',
    },
    {
      code: 6016,
      name: 'CreatorMismatch',
      msg: 'Bad creator',
    },
    {
      code: 6100,
      name: 'BadListing',
      msg: 'Bad listing',
    },
    {
      code: 6101,
      name: 'BadPool',
      msg: 'Bad pool',
    },
    {
      code: 6102,
      name: 'BadFeeWallet',
      msg: 'Bad fee wallet',
    },
    {
      code: 6103,
      name: 'BadReward',
      msg: 'Bad reward',
    },
    {
      code: 6200,
      name: 'NftTransferFailed',
      msg: 'TSWAP nft transfer failed',
    },
    {
      code: 6201,
      name: 'NftTransferRentDoesNotRemain',
      msg: 'The NFT was purchased, but all of the purchasing funds were taken, plus some rent',
    },
    {
      code: 6300,
      name: 'RollModOverflow',
      msg: 'Overflow modding roll to 10_000',
    },
    {
      code: 6301,
      name: 'ClaimWagerRebateOverflow',
      msg: 'Overflow claiming wager rebate',
    },
  ],
};
