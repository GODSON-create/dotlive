-- ============ Dynamic Founder Rankings Function ============
CREATE OR REPLACE FUNCTION public.get_founder_rankings(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _my_vantage integer;
  _my_country text;
  _my_industry text;
  _my_university text;
  _country_rank integer;
  _industry_rank integer;
  _university_rank integer;
  _total_country integer;
  _total_industry integer;
  _total_university integer;
BEGIN
  -- Get user's profile details
  SELECT vantage_point, country, industry, university 
  INTO _my_vantage, _my_country, _my_industry, _my_university
  FROM public.founder_profiles 
  WHERE user_id = _user_id;

  IF _my_vantage IS NULL THEN
    RETURN jsonb_build_object('error', 'Founder profile not found or not initialized');
  END IF;

  -- 1. Country Rank
  IF _my_country IS NOT NULL AND length(trim(_my_country)) > 0 THEN
    SELECT count(*) + 1 INTO _country_rank 
    FROM public.founder_profiles 
    WHERE country = _my_country AND vantage_point > _my_vantage;
    
    SELECT count(*) INTO _total_country 
    FROM public.founder_profiles 
    WHERE country = _my_country;
  ELSE
    _country_rank := NULL;
    _total_country := 0;
  END IF;

  -- 2. Industry Rank
  IF _my_industry IS NOT NULL AND length(trim(_my_industry)) > 0 THEN
    SELECT count(*) + 1 INTO _industry_rank 
    FROM public.founder_profiles 
    WHERE industry = _my_industry AND vantage_point > _my_vantage;
    
    SELECT count(*) INTO _total_industry 
    FROM public.founder_profiles 
    WHERE industry = _my_industry;
  ELSE
    _industry_rank := NULL;
    _total_industry := 0;
  END IF;

  -- 3. University Rank
  IF _my_university IS NOT NULL AND length(trim(_my_university)) > 0 THEN
    SELECT count(*) + 1 INTO _university_rank 
    FROM public.founder_profiles 
    WHERE university = _my_university AND vantage_point > _my_vantage;
    
    SELECT count(*) INTO _total_university 
    FROM public.founder_profiles 
    WHERE university = _my_university;
  ELSE
    _university_rank := NULL;
    _total_university := 0;
  END IF;

  RETURN jsonb_build_object(
    'country', jsonb_build_object('rank', _country_rank, 'total', _total_country, 'name', _my_country),
    'industry', jsonb_build_object('rank', _industry_rank, 'total', _total_industry, 'name', _my_industry),
    'university', jsonb_build_object('rank', _university_rank, 'total', _total_university, 'name', _my_university)
  );
END; $$;

-- ============ Secure Wallet Revaluation Charge Function ============
CREATE OR REPLACE FUNCTION public.charge_revaluation_fee(_user_id uuid, _fee numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _current_balance numeric;
BEGIN
  -- Select and lock the wallet row for update
  SELECT balance INTO _current_balance 
  FROM public.wallets 
  WHERE user_id = _user_id 
  FOR UPDATE;

  IF _current_balance IS NULL OR _current_balance < _fee THEN
    RETURN false;
  END IF;

  -- Deduct fee
  UPDATE public.wallets 
  SET balance = balance - _fee, updated_at = now() 
  WHERE user_id = _user_id;

  -- Insert transaction record
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (_user_id, -_fee, 'revaluation', 'Vantage assessment revaluation fee');

  RETURN true;
END; $$;
