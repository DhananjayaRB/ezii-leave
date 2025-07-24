--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: setup_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.setup_status AS ENUM (
    'pending',
    'in_progress',
    'completed'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'manager',
    'employee',
    'hr'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comp_off_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comp_off_config (
    id integer NOT NULL,
    enabled boolean DEFAULT false,
    max_balance integer DEFAULT 10,
    expiry_days integer DEFAULT 90,
    min_working_hours integer DEFAULT 8,
    weekends_earn boolean DEFAULT true,
    holidays_earn boolean DEFAULT true,
    overtime_earn boolean DEFAULT false,
    advance_notice_required boolean DEFAULT true,
    advance_notice_days integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60,
    minimum_leave_unit jsonb DEFAULT '["Full Day"]'::jsonb,
    compensation_options jsonb DEFAULT '["En-cashment", "Convert to leaves"]'::jsonb
);


--
-- Name: comp_off_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comp_off_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comp_off_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comp_off_config_id_seq OWNED BY public.comp_off_config.id;


--
-- Name: comp_off_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comp_off_requests (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    reason character varying NOT NULL,
    worked_date date NOT NULL,
    compensate_with date,
    lapse_on date,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    applied_at timestamp without time zone DEFAULT now(),
    approved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    rejection_reason text,
    approved_by character varying,
    notes text,
    attachments jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60,
    type character varying DEFAULT 'avail'::character varying,
    day_type character varying DEFAULT 'full'::character varying,
    transfer_amount numeric(10,2),
    en_cash_amount numeric(10,2),
    payment_details text,
    leave_type_id integer,
    workflow_id integer,
    current_step integer DEFAULT 1,
    workflow_status character varying DEFAULT 'pending'::character varying,
    approval_history jsonb DEFAULT '[]'::jsonb
);


--
-- Name: comp_off_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comp_off_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comp_off_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comp_off_requests_id_seq OWNED BY public.comp_off_requests.id;


--
-- Name: comp_off_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comp_off_variants (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    enabled boolean DEFAULT true,
    workflow_required boolean DEFAULT false,
    documents_required boolean DEFAULT false,
    applicable_after integer DEFAULT 0,
    approval_days integer DEFAULT 0,
    max_balance integer DEFAULT 0,
    expiry_days integer DEFAULT 365,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60,
    allow_full_day boolean DEFAULT false,
    full_day_hours numeric(4,2) DEFAULT 0,
    allow_half_day boolean DEFAULT false,
    half_day_hours numeric(4,2) DEFAULT 0,
    allow_quarter_day boolean DEFAULT false,
    quarter_day_hours numeric(4,2) DEFAULT 0,
    max_applications integer DEFAULT 1,
    max_applications_period character varying DEFAULT 'Month'::character varying,
    allow_non_working_days boolean DEFAULT false,
    withdrawal_before_approval boolean DEFAULT false,
    withdrawal_after_approval boolean DEFAULT false,
    withdrawal_not_allowed boolean DEFAULT true,
    allowed_during_notice boolean DEFAULT true,
    enable_carry_forward boolean DEFAULT false,
    carry_forward_days integer DEFAULT 0,
    enable_lapse boolean DEFAULT false,
    lapse_period integer DEFAULT 0,
    lapse_period_unit character varying DEFAULT 'Month'::character varying,
    enable_compensation boolean DEFAULT false,
    encashment_option boolean DEFAULT false,
    convert_to_leaves_option boolean DEFAULT false,
    encashment_based_on character varying,
    max_encashment_days integer DEFAULT 0,
    max_encashment_hours numeric(4,2) DEFAULT 0,
    convertible_leave_types jsonb
);


--
-- Name: comp_off_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comp_off_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comp_off_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comp_off_variants_id_seq OWNED BY public.comp_off_variants.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying NOT NULL,
    industry character varying,
    working_days_per_week integer DEFAULT 5,
    leave_year_start character varying DEFAULT 'January 1st'::character varying,
    setup_status public.setup_status DEFAULT 'pending'::public.setup_status,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    effective_date timestamp without time zone,
    org_id integer DEFAULT 60
);


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: employee_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_assignments (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    leave_variant_id integer NOT NULL,
    assignment_type character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60
);


--
-- Name: employee_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_assignments_id_seq OWNED BY public.employee_assignments.id;


--
-- Name: employee_leave_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_leave_balances (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    leave_variant_id integer NOT NULL,
    total_entitlement integer NOT NULL,
    current_balance integer NOT NULL,
    used_balance integer DEFAULT 0 NOT NULL,
    carry_forward integer DEFAULT 0 NOT NULL,
    year integer NOT NULL,
    org_id integer DEFAULT 60,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: employee_leave_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_leave_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_leave_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_leave_balances_id_seq OWNED BY public.employee_leave_balances.id;


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holidays (
    id integer NOT NULL,
    name character varying NOT NULL,
    date date NOT NULL,
    description text,
    is_recurring boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60
);


--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: leave_balance_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_balance_transactions (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    leave_variant_id integer NOT NULL,
    transaction_type character varying NOT NULL,
    amount integer NOT NULL,
    balance_after integer NOT NULL,
    description text,
    transaction_date timestamp without time zone DEFAULT now(),
    leave_request_id integer,
    year integer NOT NULL,
    org_id integer DEFAULT 60,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: leave_balance_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_balance_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_balance_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_balance_transactions_id_seq OWNED BY public.leave_balance_transactions.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    leave_type_id integer,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    total_days numeric(4,1) NOT NULL,
    working_days numeric(4,1) NOT NULL,
    reason text,
    status character varying DEFAULT 'pending'::character varying,
    approved_by character varying,
    approved_at timestamp without time zone,
    rejected_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60,
    documents jsonb,
    workflow_id integer,
    current_step integer DEFAULT 0,
    workflow_status character varying DEFAULT 'bypassed'::character varying,
    approval_history jsonb DEFAULT '[]'::jsonb
);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_types (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    icon character varying,
    color character varying,
    annual_allowance integer,
    carry_forward boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60
);


--
-- Name: leave_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_types_id_seq OWNED BY public.leave_types.id;


--
-- Name: leave_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_variants (
    id integer NOT NULL,
    leave_type_id integer NOT NULL,
    leave_type_name character varying NOT NULL,
    leave_variant_name character varying NOT NULL,
    description text,
    minimum_leave_unit character varying DEFAULT 'full_day'::character varying NOT NULL,
    leaves_granted_on character varying DEFAULT 'calendar_days'::character varying NOT NULL,
    paid_days_in_year integer DEFAULT 0 NOT NULL,
    grant_leaves character varying DEFAULT 'in_advance'::character varying NOT NULL,
    grant_frequency character varying DEFAULT 'per_year'::character varying NOT NULL,
    pro_rata_calculation character varying DEFAULT 'full_month'::character varying NOT NULL,
    slabs jsonb,
    fractional_leaves character varying DEFAULT 'normal_rounding'::character varying,
    applicable_genders jsonb NOT NULL,
    applicable_after integer DEFAULT 0 NOT NULL,
    must_be_planned_in_advance integer DEFAULT 0 NOT NULL,
    max_days_in_stretch integer DEFAULT 0 NOT NULL,
    min_days_required integer DEFAULT 0 NOT NULL,
    max_instances integer DEFAULT 0 NOT NULL,
    max_instances_period character varying DEFAULT 'year'::character varying NOT NULL,
    allow_leaves_before_weekend boolean DEFAULT false,
    allow_leaves_before_holiday boolean DEFAULT false,
    allow_clubbing boolean DEFAULT false,
    supporting_documents boolean DEFAULT false,
    supporting_documents_text text,
    allow_during_notice boolean DEFAULT false,
    requires_workflow boolean DEFAULT true,
    grace_period integer DEFAULT 0 NOT NULL,
    allow_withdrawal_before_approval boolean DEFAULT false,
    allow_withdrawal_after_approval boolean DEFAULT false,
    allow_withdrawal_not_allowed boolean DEFAULT true,
    negative_leave_balance integer DEFAULT 0 NOT NULL,
    carry_forward_limit integer DEFAULT 0 NOT NULL,
    carry_forward_period character varying DEFAULT 'year'::character varying NOT NULL,
    encashment boolean DEFAULT false,
    encashment_calculation character varying,
    max_encashment_days integer,
    encashment_timing character varying,
    allow_applications_on_behalf boolean DEFAULT false,
    show_availed_leaves boolean DEFAULT false,
    show_balance_leaves boolean DEFAULT false,
    maximum_balance integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    leave_balance_deduction_before boolean DEFAULT false,
    leave_balance_deduction_after boolean DEFAULT false,
    leave_balance_deduction_not_allowed boolean DEFAULT false,
    org_id integer DEFAULT 60,
    onboarding_slabs jsonb,
    exit_slabs jsonb,
    applicable_after_type character varying DEFAULT 'days'::character varying NOT NULL
);


--
-- Name: leave_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_variants_id_seq OWNED BY public.leave_variants.id;


--
-- Name: pto_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pto_config (
    id integer NOT NULL,
    enabled boolean DEFAULT false,
    annual_allowance integer DEFAULT 25,
    accrual_method character varying DEFAULT 'monthly'::character varying,
    max_carryover integer DEFAULT 5,
    allow_negative_balance boolean DEFAULT false,
    pro_rate_new_hires boolean DEFAULT true,
    payout_on_termination boolean DEFAULT false,
    accrual_rules jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60
);


--
-- Name: pto_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pto_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pto_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pto_config_id_seq OWNED BY public.pto_config.id;


--
-- Name: pto_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pto_requests (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    pto_variant_id integer NOT NULL,
    request_date date NOT NULL,
    time_type character varying NOT NULL,
    start_time character varying,
    end_time character varying,
    total_hours numeric(4,2),
    reason text NOT NULL,
    document_url character varying,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    approved_by character varying,
    approved_at timestamp without time zone,
    rejection_reason text,
    workflow_id integer,
    current_step integer DEFAULT 1,
    workflow_status character varying DEFAULT 'pending'::character varying,
    approval_history jsonb DEFAULT '[]'::jsonb,
    org_id integer DEFAULT 60,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: pto_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pto_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pto_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pto_requests_id_seq OWNED BY public.pto_requests.id;


--
-- Name: pto_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pto_variants (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    enabled boolean DEFAULT true,
    half_day boolean DEFAULT false,
    quarter_day boolean DEFAULT false,
    hours boolean DEFAULT false,
    workflow_required boolean DEFAULT false,
    notice_period_allowed boolean DEFAULT true,
    documents_required boolean DEFAULT false,
    applicable_after integer DEFAULT 0,
    approval_days integer DEFAULT 0,
    minimum_hours integer DEFAULT 0,
    max_hours integer DEFAULT 0,
    max_instances integer DEFAULT 0,
    max_instances_period character varying DEFAULT 'Month'::character varying,
    granting_period character varying DEFAULT 'Yearly'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60,
    loss_of_pay boolean DEFAULT true,
    deduct_half_day boolean DEFAULT false,
    deduct_quarter_day boolean DEFAULT false,
    deduct_hours boolean DEFAULT false,
    applicable_after_type character varying DEFAULT 'date_of_joining'::character varying,
    withdrawal_before_approval boolean DEFAULT true,
    withdrawal_after_approval boolean DEFAULT false,
    withdrawal_not_allowed boolean DEFAULT false,
    deductible_leave_types text[]
);


--
-- Name: pto_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pto_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pto_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pto_variants_id_seq OWNED BY public.pto_variants.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    role public.user_role DEFAULT 'employee'::public.user_role NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60
);


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflows (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    steps jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer DEFAULT 60,
    process character varying,
    sub_processes text[],
    effective_date date
);


--
-- Name: workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflows_id_seq OWNED BY public.workflows.id;


--
-- Name: comp_off_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comp_off_config ALTER COLUMN id SET DEFAULT nextval('public.comp_off_config_id_seq'::regclass);


--
-- Name: comp_off_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comp_off_requests ALTER COLUMN id SET DEFAULT nextval('public.comp_off_requests_id_seq'::regclass);


--
-- Name: comp_off_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comp_off_variants ALTER COLUMN id SET DEFAULT nextval('public.comp_off_variants_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: employee_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_assignments ALTER COLUMN id SET DEFAULT nextval('public.employee_assignments_id_seq'::regclass);


--
-- Name: employee_leave_balances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances ALTER COLUMN id SET DEFAULT nextval('public.employee_leave_balances_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: leave_balance_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_balance_transactions ALTER COLUMN id SET DEFAULT nextval('public.leave_balance_transactions_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: leave_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types ALTER COLUMN id SET DEFAULT nextval('public.leave_types_id_seq'::regclass);


--
-- Name: leave_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_variants ALTER COLUMN id SET DEFAULT nextval('public.leave_variants_id_seq'::regclass);


--
-- Name: pto_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pto_config ALTER COLUMN id SET DEFAULT nextval('public.pto_config_id_seq'::regclass);


--
-- Name: pto_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pto_requests ALTER COLUMN id SET DEFAULT nextval('public.pto_requests_id_seq'::regclass);


--
-- Name: pto_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pto_variants ALTER COLUMN id SET DEFAULT nextval('public.pto_variants_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: workflows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows ALTER COLUMN id SET DEFAULT nextval('public.workflows_id_seq'::regclass);


--
-- Name: comp_off_config comp_off_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comp_off_config
    ADD CONSTRAINT comp_off_config_pkey PRIMARY KEY (id);


--
-- Name: comp_off_requests comp_off_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comp_off_requests
    ADD CONSTRAINT comp_off_requests_pkey PRIMARY KEY (id);


--
-- Name: comp_off_variants comp_off_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comp_off_variants
    ADD CONSTRAINT comp_off_variants_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: employee_assignments employee_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_assignments
    ADD CONSTRAINT employee_assignments_pkey PRIMARY KEY (id);


--
-- Name: employee_leave_balances employee_leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_pkey PRIMARY KEY (id);


--
-- Name: employee_leave_balances employee_leave_balances_user_id_leave_variant_id_year_org_id_un; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_user_id_leave_variant_id_year_org_id_un UNIQUE (user_id, leave_variant_id, year, org_id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: leave_balance_transactions leave_balance_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_balance_transactions
    ADD CONSTRAINT leave_balance_transactions_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: leave_variants leave_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_variants
    ADD CONSTRAINT leave_variants_pkey PRIMARY KEY (id);


--
-- Name: pto_config pto_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pto_config
    ADD CONSTRAINT pto_config_pkey PRIMARY KEY (id);


--
-- Name: pto_requests pto_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pto_requests
    ADD CONSTRAINT pto_requests_pkey PRIMARY KEY (id);


--
-- Name: pto_variants pto_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pto_variants
    ADD CONSTRAINT pto_variants_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: leave_variants leave_variants_leave_type_id_leave_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_variants
    ADD CONSTRAINT leave_variants_leave_type_id_leave_types_id_fk FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);


--
-- Name: pto_requests pto_requests_pto_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pto_requests
    ADD CONSTRAINT pto_requests_pto_variant_id_fkey FOREIGN KEY (pto_variant_id) REFERENCES public.pto_variants(id);


--
-- Name: user_roles user_roles_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

