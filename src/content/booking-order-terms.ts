/**
 * Default Terms & Conditions for the Media Booking Order (English).
 * Rendered as the BO's Terms page and used as the seed value for the
 * editable per-company T&C block. Source: Mindset Media (2026-09-19).
 *
 * Each section is a heading plus one or more paragraphs/clauses.
 */

export type TermsSection = { heading: string; clauses: string[] };

export const BOOKING_ORDER_TERMS_INTRO =
  'These advertising terms and conditions ("T&C") govern the provision of services under this Booking Order (the "BO").';

export const BOOKING_ORDER_TERMS: TermsSection[] = [
  {
    heading: "Governing Law and Jurisdiction",
    clauses: [
      "This BO shall be governed by and construed in accordance with the laws of the Emirate of Dubai. The parties agree to submit to the exclusive jurisdiction of the Dubai Courts.",
    ],
  },
  {
    heading: "Entire Agreement",
    clauses: [
      "This BO constitutes the entire agreement between the parties and supersedes all prior agreements. Amendments or modifications must be in writing and signed by both parties.",
    ],
  },
  {
    heading: "Advertising Materials",
    clauses: [
      "Unless otherwise specified in the BO, the Advertiser shall submit all advertising materials no later than five (5) working days prior to the Campaign Start Date. The Company will not be deemed to have accepted the BO until it has sent a written confirmation via email.",
    ],
  },
  {
    heading: "Payment Terms",
    clauses: [
      "Unless otherwise stated in the BO, the Total Net Price, inclusive of any applicable VAT, must be paid in full at least three (3) days prior to the Campaign Start Date. Failure to pay on time may result in suspension of the Advertiser's campaign, with all outstanding amounts immediately due.",
    ],
  },
  {
    heading: "Taxes",
    clauses: [
      "All charges are exclusive of applicable taxes (e.g., VAT), which shall be paid by the Advertiser at the prevailing rate.",
    ],
  },
  {
    heading: "Incentives and Discounts",
    clauses: [
      "Where applicable, the Company shall provide the Advertiser with incentives and/or discounts as detailed in the BO.",
    ],
  },
  {
    heading: "Cancellations",
    clauses: [
      "(i) Advertisers acknowledge and agree that cancellations made after the Campaign Start Date will not be eligible for a refund, and the total fee will be forfeited to the Company. The Company retains the right to reuse the released advertising space.",
      "(ii) The Company may cancel or postpone a campaign for compelling reasons, including but not limited to national mourning or force majeure events.",
    ],
  },
  {
    heading: "Company Rights",
    clauses: [
      "The Company reserves the right to:",
      "(i) Cancel or postpone the BO in the event of inventory unavailability, at its sole discretion;",
      '(ii) Refuse to publish any advertising materials containing content deemed, at the Company\'s sole discretion, unlawful, defamatory, obscene, harassing, fraudulent, or otherwise objectionable ("Prohibited Content"); and',
      "(iii) Modify or remove advertising materials to ensure compliance with applicable laws and regulations.",
    ],
  },
  {
    heading: "Termination for Material Breach",
    clauses: [
      "The Company may terminate the BO if the Advertiser commits a material breach that is not remedied within five (5) working days of written notice. Upon termination, the Advertiser shall immediately pay all outstanding fees, including the value of any incentives previously granted by the Company.",
    ],
  },
  {
    heading: "Advertiser Warranties",
    clauses: [
      "The Advertiser warrants that all submitted advertising materials:",
      "(i) Do not infringe upon any third-party intellectual property rights.",
      "(ii) Comply with applicable laws and regulations; and",
      "(iii) Contain no Prohibited Content.",
    ],
  },
  {
    heading: "Indemnification",
    clauses: [
      "The Advertiser shall indemnify and hold harmless the Company, its affiliates, and their officers, directors, and employees against any claims, losses, or damages arising from:",
      "Allegations that the Advertiser's materials infringe third-party intellectual property rights; or",
      "Any breach of the Advertiser's warranties, representations, or obligations under this BO.",
    ],
  },
  {
    heading: "Limitation of Liability",
    clauses: [
      "The Company shall not be liable for any indirect, consequential, or incidental damages, including loss of profits or business revenue, arising out of this BO. The Company's aggregate liability shall not exceed the total fees paid by the Advertiser under the BO.",
    ],
  },
  {
    heading: "Intellectual Property Rights",
    clauses: [
      "Each party shall retain ownership of its respective intellectual property, including but not limited to documents, methodologies, processes, and trade secrets provided under this BO.",
      "The Advertiser grants the Company a non-exclusive right to use its intellectual property solely for the execution of the campaign under this BO.",
      "Neither party may claim ownership of or use the other party's intellectual property without prior written consent.",
    ],
  },
  {
    heading: "Confidentiality",
    clauses: [
      "Each party shall treat all information received from the other as confidential and shall not disclose such information to any third party without prior written consent, except as required by law.",
    ],
  },
  {
    heading: "Order of Precedence",
    clauses: [
      "In the event of any inconsistency between this BO and these T&Cs, the terms of the BO shall prevail.",
    ],
  },
  {
    heading: "Assignment",
    clauses: [
      "The Advertiser shall not assign or transfer its rights or obligations under this BO without prior written consent from the Company.",
    ],
  },
  {
    heading: "Regulatory Approvals",
    clauses: [
      "The Advertiser shall bear sole responsibility for obtaining all necessary regulatory approvals and permits as required by applicable laws.",
    ],
  },
  {
    heading: "No Partnership",
    clauses: [
      "Nothing in this BO shall be construed as creating a partnership, agency, or joint venture between the parties. Neither party shall have the authority to bind the other.",
    ],
  },
];
